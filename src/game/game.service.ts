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
    CODE_DESCRIPTION,
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
        const gameState: GameState = this.gameStates[playerId];
        const playerState: PlayerState = this.gameStates[playerId]?.playerState;
        const blindState: BlindState = this.gameStates[playerId]?.blindState;

        if (!gameState || !playerState || !blindState) {
            return {
                code: GAME_STATE_CODE.GAME_NOT_FOUND,
            };
        }

        const handSize: number = playerState.handSize;
        if (gameState.gameStatus == "playing") {
            return {
                code: GAME_STATE_CODE.GAME_ALREADY_STARTED,
                playerState: {
                    hand: playerState.hand,
                    remainingDeckCount: playerState.deck.length,
                    playsLeft: playerState.playsLeft,
                    discardsLeft: playerState.discardsLeft,
                },
                blindState: {
                    round: blindState.round,
                    ante: blindState.ante,
                    blindType: blindState.blindType,
                    targetScore: blindState.targetScore,
                    currentAnteConfig: blindState.currentAnteConfig,
                },
            };
        }

        playerState.deck = this.pokerService.shuffleDeck(this.pokerService.getBaseDeck());

        const hand = this.pokerService.serializeCards(playerState.deck.splice(0, handSize));
        hand.sort((a, b) => {
            return this.pokerService.getCardRank(b) - this.pokerService.getCardRank(a);
        });
        playerState.hand = hand;
        gameState.gameStatus = "playing";

        const dealResult = {
            code: RESULT_CODE.SUCCESS,
            playerState: {
                hand: playerState.hand,
                remainingDeckCount: playerState.deck.length,
                playsLeft: GAME_RULE.INITIAL_PLAYS_LEFT,
                discardsLeft: GAME_RULE.INITIAL_DISCARDS_LEFT,
            },
            blindState: {
                round: blindState.round,
                ante: blindState.ante,
                blindType: blindState.blindType,
                targetScore: blindState.targetScore,
                currentAnteConfig: blindState.currentAnteConfig,
            },
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
            return this.buildSelectCardsResult({ code: PLAYER_STATE_CODE.NOT_FOUND, action: action });
        }

        if (gameState.gameStatus !== "playing") {
            return this.buildSelectCardsResult({ code: GAME_STATE_CODE.GAME_NOT_STARTED, action: action });
        }

        const handCards: string[] = playerState.hand;

        if (!selectedCards?.length) {
            return this.buildSelectCardsResult({ code: REQUEST_PARAM_CODE.EMPTY_SELECTED_CARDS, action: action });
        }

        if (selectedCards?.length > GAME_RULE.MAX_SELECT_CARDS) {
            return this.buildSelectCardsResult({ code: REQUEST_PARAM_CODE.CARDS_LIMIT_EXCEEDED, action: action });
        }

        const validCard = selectedCards.every((card) => CARD_PATTERN.test(card));
        if (!validCard) {
            return this.buildSelectCardsResult({ code: REQUEST_PARAM_CODE.INVALID_CARD_FORMAT, action: action });
        }

        const selectedSet = new Set(selectedCards);
        if (selectedSet.size !== selectedCards.length) {
            return this.buildSelectCardsResult({ code: REQUEST_PARAM_CODE.DUPLICATE_SELECTED_CARDS, action: action });
        }

        const existCards = selectedCards.every((item) => handCards.includes(item));
        if (!existCards) {
            return this.buildSelectCardsResult({ code: REQUEST_PARAM_CODE.CARD_NOT_IN_HAND, action: action });
        }

        if (action !== SELECT_CARD_ACTION.PLAY && action !== SELECT_CARD_ACTION.DISCARD) {
            return this.buildSelectCardsResult({ code: REQUEST_PARAM_CODE.INVALID_ACTION, action: action });
        }

        if (action == SELECT_CARD_ACTION.PLAY && playerState.playsLeft <= 0) {
            return this.buildSelectCardsResult({ code: GAME_FLOW_CODE.NO_PLAYS_LEFT, action: action });
        }

        if (action == SELECT_CARD_ACTION.DISCARD && playerState.discardsLeft <= 0) {
            return this.buildSelectCardsResult({ code: GAME_FLOW_CODE.NO_DISCARDS_LEFT, action: action });
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

        const selectCardsResult = this.buildSelectCardsResult({
            code: RESULT_CODE.SUCCESS,
            action,
            selectedCards,
            gameState,
            cardType,
            validCards,
            baseScore,
            multiplier,
        });

        // this.logger.log(
        //     `-${playerId}- user hand cards: ${JSON.stringify(playerState.hand)}, remaining cards: ${JSON.stringify(playerState.deck)}`,
        // );

        return selectCardsResult;
    }

    private buildSelectCardsResult(param: {
        code: number;
        action: string;
        selectedCards?: string[];
        gameState?: GameState;
        cardType?: number;
        validCards?: string[];
        baseScore?: number;
        multiplier?: number;
    }): SelectCardsResult {
        const { code, action, selectedCards, gameState, cardType, validCards, baseScore, multiplier } = param;
        this.logger.log(`buildSelectCardsResult : ${JSON.stringify(param)}`);

        if (code != RESULT_CODE.SUCCESS) {
            return { code, message: CODE_DESCRIPTION[code], action };
        }

        if (
            !gameState ||
            selectedCards === undefined ||
            cardType === undefined ||
            validCards === undefined ||
            baseScore === undefined ||
            multiplier === undefined
        ) {
            return {
                code: REQUEST_PARAM_CODE.PARAM_ERROR,
                message: CODE_DESCRIPTION[REQUEST_PARAM_CODE.PARAM_ERROR],
                action: action,
            };
        }

        const playerStates: PlayerState = gameState.playerState;
        const blindStates: BlindState = gameState.blindState;

        const blindOver = this.isBlindOver(playerStates, gameState);
        if (blindOver) gameState.gameStatus = "finished";

        const ante = blindStates.currentAnteConfig.ante;

        const actions = {
            selectedCards,
            cardType,
            validCards,
            baseScore,
            multiplier,
        };

        const playerState: GameStateResponse = {
            hand: playerStates.hand,
            playsLeft: playerStates.playsLeft,
            discardsLeft: playerStates.discardsLeft,
            remainingDeckCount: playerStates.deck.length,
            currentBlindScore: blindStates.currentBlindScore,
            currentActionScore: playerStates.currentActionScore,
            gameStatus: gameState.gameStatus,
            targetScore: blindStates.targetScore,
        };

        const blindState = {
            round: blindStates.round,
            ante: ante,
            blindType: blindStates.blindType,
            targetScore: blindStates.targetScore,
            currentBlindScore: blindStates.currentBlindScore,
        };

        const progress: Progress = {
            gameOver: false,
            blindOver: blindOver,
            currentAnteConfig: blindStates.currentAnteConfig,
        };

        if (blindOver) {
            const result = blindStates.currentBlindScore >= blindStates.targetScore ? "WIN" : "LOSE";

            progress.settlement = {
                finalScore: blindStates.currentBlindScore,
                targetScore: blindStates.targetScore,
                result: result,
            };

            if (result === "LOSE") {
                progress.gameOver = true;
                delete this.gameStates[gameState.playerId];
            } else {
                const nextProgress = this.getNextBlindProgress(gameState);

                progress.nextBlindConfig = nextProgress.nextBlindConfig;

                if (nextProgress.nextAnteConfig) {
                    progress.nextAnteConfig = nextProgress.nextAnteConfig;
                }

                this.advanceToNextBlind(gameState, nextProgress);
            }
        }

        return {
            code,
            message: CODE_DESCRIPTION[code],
            action: action,
            playerState,
            blindState,
            progress,
            actions,
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

    private getNextBlindProgress(gameState: GameState): {
        nextBlindConfig: NextBlindConfig;
        nextAnteConfig?: AnteConfig;
    } {
        const blindState = gameState.blindState;
        const currentAnteConfig = blindState.currentAnteConfig;

        if (blindState.blindType === "small") {
            return {
                nextBlindConfig: {
                    ante: blindState.ante,
                    blindType: "big",
                    score: currentAnteConfig.big.score,
                },
            };
        }

        if (blindState.blindType === "big") {
            return {
                nextBlindConfig: {
                    ante: blindState.ante,
                    blindType: "boss",
                    score: currentAnteConfig.boss.score,
                    boss: {
                        code: currentAnteConfig.boss.code,
                        name: currentAnteConfig.boss.name,
                    },
                },
            };
        }

        const nextAnte = Math.floor(blindState.round / 3) + 1;
        const nextAnteConfig = this.getAnteConfig(gameState.playerId, nextAnte);

        return {
            nextBlindConfig: {
                ante: nextAnte,
                blindType: "small",
                score: nextAnteConfig.small.score,
            },
            nextAnteConfig,
        };
    }

    private isBlindOver(playerState: PlayerState, gameState: GameState): boolean {
        return playerState.playsLeft <= 0 || gameState.blindState.currentBlindScore >= gameState.blindState.targetScore;
    }

    private getAnteConfig(playerId: string, ante: number): AnteConfig {
        let bossBlindAssignmentsByPlayer = this.bossBlindAssignments[playerId];
        if (!bossBlindAssignmentsByPlayer) {
            const bossBlindCodeList: BossBlindCode[] = Object.values(BOSS_BLIND_CODE);
            bossBlindAssignmentsByPlayer = this.shuffleBossConfig(bossBlindCodeList);

            this.bossBlindAssignments[playerId] = bossBlindAssignmentsByPlayer;
        }
        // this.logger.log(`Player ${playerId}, bossBlindAssignments: ${JSON.stringify(this.bossBlindAssignments[playerId])}`);

        const code = bossBlindAssignmentsByPlayer.pop();
        if (!code) {
            throw new Error(`No more boss blind code available for player: ${playerId}`);
        }

        const blindConfig = BLIND_SCORE_CONFIG[ante];
        if (!blindConfig) {
            throw new Error(`Blind config not found for ante: ${ante}`);
        }

        const currentAnteConfig = {
            ante: ante,
            small: { score: BLIND_SCORE_CONFIG[ante][0].score },
            big: { score: BLIND_SCORE_CONFIG[ante][1].score },
            boss: {
                score: BLIND_SCORE_CONFIG[ante][2].score,
                code: code,
                name: BOSS_BLIND_CONFIG[code].name,
            },
        };
        return currentAnteConfig;
    }

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
