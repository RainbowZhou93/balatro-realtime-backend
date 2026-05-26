import { Injectable, Logger } from "@nestjs/common";
import { Card } from "../poker/poker.types";
import { PokerService } from "../poker/poker.service";
import { CARD_PATTERN } from "../poker/poker.constants";
import { BOSS_BLIND_CONFIG, BossBlindCode, BOSS_BLIND_CODE } from "../poker/boss.config";

import { BLIND_SCORE_CONFIG } from "./blind.config";
import {
    GameState,
    PlayerState,
    BlindState,
    GameStateResponse,
    SelectCardsResult,
    DealResult,
    AnteConfig,
    Progress,
    NextBlindConfig,
} from "./game.types";

import {
    RESULT_CODE,
    PLAYER_STATE_CODE,
    REQUEST_PARAM_CODE,
    GAME_FLOW_CODE,
    SELECT_CARD_ACTION,
    GAME_RULE,
    GAME_STATE_CODE,
} from "./game.constants";

@Injectable()
export class GameService {
    private readonly logger = new Logger(GameService.name);
    /**
     * Stores each player's remaining deck during the current game.
     * Key: playerId
     * Value: remaining cards in the player's deck
     *
     * Note:
     * This is an in-memory state for the current phase.
     * It may be moved to Redis or database storage in later stages.
     */
    private readonly gameStates: Record<string, GameState> = {};

    private readonly bossBlindAssignments: Record<string, BossBlindCode[]> = {};

    constructor(private readonly pokerService: PokerService) {}

    initGame(playerId: string): GameState {
        if (this.gameStates[playerId]) delete this.gameStates[playerId];
        if (this.bossBlindAssignments[playerId]) delete this.bossBlindAssignments[playerId];

        const gameState: GameState = this.createInitialGameState(playerId);
        this.gameStates[playerId] = gameState;
        return gameState;
    }

    // Start a new single-player game by initializing state, shuffling deck, and dealing the initial hand.
    startGame(playerId: string): DealResult {
        let gameState: GameState;
        let playerState: PlayerState;
        gameState = this.gameStates[playerId];

        playerState = this.gameStates[playerId]?.playerState;
        const handSize: number = playerState?.handSize ?? GAME_RULE.DEFAULT_HAND_SIZE;
        if (gameState?.gameStatus == "playing") {
            return {
                code: GAME_STATE_CODE.GAME_ALREADY_STARTED,
                hand: playerState.hand,
                remainingDeckCount: playerState.deck.length,
                playsLeft: playerState.playsLeft,
                discardsLeft: playerState.discardsLeft,
                round: gameState.blindState.round,
                ante: gameState.blindState.ante,
                blindType: gameState.blindState.blindType,
                targetScore: gameState.blindState.targetScore,
            };
        }
        gameState = this.initGameState(playerId, gameState);
        playerState = gameState.playerState;

        const deck = playerState.deck;
        const hand = this.pokerService.serializeCards(deck.splice(0, handSize));
        hand.sort((a, b) => {
            return this.pokerService.getCardRank(b) - this.pokerService.getCardRank(a);
        });

        playerState.hand = hand;

        const dealResult = {
            code: RESULT_CODE.SUCCESS,
            hand,
            remainingDeckCount: playerState.deck.length,
            playsLeft: playerState.playsLeft,
            discardsLeft: playerState.discardsLeft,
            round: gameState.blindState.round,
            ante: gameState.blindState.ante,
            blindType: gameState.blindState.blindType,
            targetScore: gameState.blindState.targetScore,
        };
        // this.logger.log(`-${playerId}- startGame playerState: ${JSON.stringify(gameState)}`);
        return dealResult;
    }

    //统一处理出牌和弃牌：两者都会移除所选手牌并自动补牌，区别是扣减不同的操作次数。
    selectCards(selectedCards: string[], action: "play" | "discard", playerId: string): SelectCardsResult {
        const gameState: GameState = this.gameStates[playerId];
        const playerState: PlayerState = gameState?.playerState;
        const blindState: BlindState = gameState?.blindState;
        let cardType: number = 0;
        let baseScore: number = 0;
        let multiplier: number = 0;
        let validCards: string[] = [];
        if (!playerId || !gameState) {
            return { code: PLAYER_STATE_CODE.NOT_FOUND, selectedCards };
        }

        if (gameState.gameStatus !== "playing") {
            return this.buildSelectCardsResult(GAME_STATE_CODE.GAME_ALREADY_FINISHED, selectedCards, gameState);
        }

        const handCards: string[] = playerState.hand;

        if (!selectedCards?.length) {
            return this.buildSelectCardsResult(REQUEST_PARAM_CODE.EMPTY_SELECTED_CARDS, selectedCards, gameState);
        }

        if (selectedCards?.length > GAME_RULE.MAX_SELECT_CARDS) {
            return this.buildSelectCardsResult(REQUEST_PARAM_CODE.CARDS_LIMIT_EXCEEDED, selectedCards, gameState);
        }

        const validCard = selectedCards.every((card) => CARD_PATTERN.test(card));
        if (!validCard) {
            return this.buildSelectCardsResult(REQUEST_PARAM_CODE.INVALID_CARD_FORMAT, selectedCards, gameState);
        }

        const selectedSet = new Set(selectedCards);
        if (selectedSet.size !== selectedCards.length) {
            return this.buildSelectCardsResult(REQUEST_PARAM_CODE.DUPLICATE_SELECTED_CARDS, selectedCards, gameState);
        }

        const existCards = selectedCards.every((item) => handCards.includes(item));
        if (!existCards) {
            return this.buildSelectCardsResult(REQUEST_PARAM_CODE.CARD_NOT_IN_HAND, selectedCards, gameState);
        }

        if (action !== SELECT_CARD_ACTION.PLAY && action !== SELECT_CARD_ACTION.DISCARD) {
            return this.buildSelectCardsResult(REQUEST_PARAM_CODE.INVALID_ACTION, selectedCards, gameState);
        }

        if (action == SELECT_CARD_ACTION.PLAY && playerState.playsLeft <= 0) {
            return this.buildSelectCardsResult(GAME_FLOW_CODE.NO_PLAYS_LEFT, selectedCards, gameState);
        }

        if (action == SELECT_CARD_ACTION.DISCARD && playerState.discardsLeft <= 0) {
            return this.buildSelectCardsResult(GAME_FLOW_CODE.NO_DISCARDS_LEFT, selectedCards, gameState);
        }

        if (action == SELECT_CARD_ACTION.PLAY) {
            const result = this.pokerService.calculateHandScore(selectedCards);
            baseScore = result.baseScore;
            multiplier = result.multiplier;
            cardType = result.handType;
            validCards = result.validCards;

            blindState.currentBlindScore += baseScore * multiplier;
            playerState.currentActionScore = baseScore * multiplier;
        } else {
            playerState.currentActionScore = 0;
        }

        const newHand = this.removeAndDrawCards(selectedCards, handCards, gameState);
        playerState.hand = newHand;
        if (action == SELECT_CARD_ACTION.PLAY) playerState.playsLeft--;
        if (action == SELECT_CARD_ACTION.DISCARD) playerState.discardsLeft--;

        if (this.isBlindOver(playerState, gameState)) gameState.gameStatus = "finished";
        const returnMsg = this.buildSelectCardsResult(RESULT_CODE.SUCCESS, selectedCards, gameState);

        // this.logger.log(
        //     `-${playerId}- user hand cards: ${JSON.stringify(playerState.hand)}, remaining cards: ${JSON.stringify(playerState.deck)}`,
        // );
        returnMsg.blindOver = gameState.gameStatus === "finished";
        returnMsg.gameOver = false;
        returnMsg.remainingDeckCount = playerState.deck.length;
        returnMsg.cardType = cardType;
        returnMsg.validCards = validCards;
        returnMsg.baseScore = baseScore;
        returnMsg.multiplier = multiplier;
        returnMsg.round = blindState.round;
        returnMsg.ante = blindState.ante;
        returnMsg.blindType = blindState.blindType;
        if (returnMsg.blindOver) {
            const result = blindState.currentBlindScore >= blindState.targetScore ? "WIN" : "LOSE";
            returnMsg.settlement = {
                finalScore: blindState.currentBlindScore,
                targetScore: blindState.targetScore,
                result: result,
            };
            if (result === "LOSE") {
                returnMsg.gameOver = true;
                // Reset the game state for the player, allowing them to start a new game immediately after losing.
                delete this.gameStates[playerId];
            }
        }
        return returnMsg;
    }

    private buildSelectCardsResult(code: number, selectedCards: string[], gameState: GameState): SelectCardsResult {
        const playerState: PlayerState = gameState.playerState;
        const playerStateResponse: GameStateResponse = {
            hand: playerState.hand,
            playsLeft: playerState.playsLeft,
            discardsLeft: playerState.discardsLeft,
            remainingDeckCount: playerState.deck.length,
            currentBlindScore: gameState.blindState.currentBlindScore,
            currentActionScore: playerState.currentActionScore,
            gameStatus: gameState.gameStatus,
            targetScore: gameState.blindState.targetScore,
        };
        return {
            code,
            selectedCards,
            playerState: playerStateResponse,
        };
    }

    // Based on the current player state, remove selected cards from hand and draw the same number of cards from deck.
    private removeAndDrawCards(selectedCards: string[], handCards: string[], gameState: GameState): string[] {
        const newHand: string[] = [];
        const deck: Card[] = gameState.playerState.deck;
        for (let i = 0; i < handCards.length; i++) {
            if (!selectedCards.includes(handCards[i])) {
                newHand.push(handCards[i]);
            }
        }

        const getSize: number = gameState.playerState.handSize - newHand.length;
        const getDeck: string[] = this.pokerService.serializeCards(deck.splice(0, getSize));

        newHand.push(...getDeck);
        //newHand = ["KC","8D","7C","AD","9D","8S","JH","AS"], 做排序，A最大，2最小
        newHand.sort((a, b) => {
            return this.pokerService.getCardRank(b) - this.pokerService.getCardRank(a);
        });
        // this.logger.log(`removeAndDrawCards selectedCards: ${JSON.stringify(newHand)}`);
        return newHand;
    }

    private createInitialGameState(playerId: string): GameState {
        const currentAnteConfig = this.getAnteConfig(playerId, 1);
        this.gameStates[playerId] = {
            playerId: playerId,
            playerState: {
                deck: [],
                hand: [],
                playsLeft: GAME_RULE.INITIAL_PLAYS_LEFT,
                discardsLeft: GAME_RULE.INITIAL_DISCARDS_LEFT,
                handSize: GAME_RULE.DEFAULT_HAND_SIZE,
                currentActionScore: 0,
            },
            blindState: {
                round: 1,
                ante: 1,
                blindType: "small",
                targetScore: currentAnteConfig.small.score,
                currentAnteConfig: currentAnteConfig,
                currentBlindScore: 0,
            },
            gameStatus: "initialized",
        };

        return this.gameStates[playerId];
    }

    private isBlindOver(playerState: PlayerState, gameState: GameState): boolean {
        return playerState.playsLeft <= 0 || gameState.blindState.currentBlindScore >= gameState.blindState.targetScore;
    }

    private getBlindConfig(round: number) {
        const ante = Math.floor((round - 1) / 3) + 1;
        const blindTypeIndex = (round - 1) % 3;
        const blindConfig = BLIND_SCORE_CONFIG[ante];

        if (!blindConfig?.[blindTypeIndex]) {
            throw new Error(`Blind config not found for round: ${round}, ante: ${ante}`);
        }

        return {
            ante,
            blindType: blindConfig[blindTypeIndex].type,
            targetScore: blindConfig[blindTypeIndex].score,
        };
    private advanceToNextBlind(
        gameState: GameState,
        nextProgress: {
            nextBlindConfig: NextBlindConfig;
            nextAnteConfig?: AnteConfig;
        },
    ): void {
        const nextBlindConfig = nextProgress.nextBlindConfig;

        gameState.blindState.round += 1;
        gameState.blindState.ante = nextBlindConfig.ante;
        gameState.blindState.blindType = nextBlindConfig.blindType;
        gameState.blindState.targetScore = nextBlindConfig.score;
        gameState.blindState.currentBlindScore = 0;

        if (nextProgress.nextAnteConfig) {
            gameState.blindState.currentAnteConfig = nextProgress.nextAnteConfig;
        }
    }

    private shuffleBossConfig<T>(arr: T[]): T[] {
        const out = [...arr];
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    }
}
