import { Injectable, Logger } from "@nestjs/common";
import { Card } from "../poker/poker.types";
import { PokerService } from "../poker/poker.service";
import { CARD_PATTERN } from "../poker/poker.constants";

import { GameState, PlayerState, BlindState, GameStateResponse, SelectCardsResult, DealResult } from "./game.types";
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

    constructor(private readonly pokerService: PokerService) {}

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
            };
        }
        gameState = this.initGameState(playerId, gameState, playerState);
        playerState = gameState.playerState;

        const deck = playerState.deck;
        const hand = this.pokerService.serializeCards(deck.splice(0, handSize));
        hand.sort((a, b) => {
            return this.pokerService.getCardRank(b) - this.pokerService.getCardRank(a);
        });
        playerState.hand = hand;
        playerState.deck = deck;

        const dealResult = {
            code: RESULT_CODE.SUCCESS,
            hand,
            remainingDeckCount: playerState.deck.length,
            playsLeft: playerState.playsLeft,
            discardsLeft: playerState.discardsLeft,
        };

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
        }
        blindState.currentBlindScore += baseScore * multiplier;
        playerState.currentActionScore = baseScore * multiplier;

        const newHand = this.removeAndDrawCards(selectedCards, handCards, gameState);
        playerState.hand = newHand;
        if (action == SELECT_CARD_ACTION.PLAY) playerState.playsLeft--;
        if (action == SELECT_CARD_ACTION.DISCARD) playerState.discardsLeft--;

        if (this.isGameOver(playerState, gameState)) gameState.gameStatus = "finished";
        const returnMsg = this.buildSelectCardsResult(RESULT_CODE.SUCCESS, selectedCards, gameState);

        // this.logger.log(
        //     `-${playerId}- user hand cards: ${JSON.stringify(playerState.hand)}, remaining cards: ${JSON.stringify(playerState.deck)}`,
        // );
        returnMsg.gameOver = gameState.gameStatus === "finished";
        returnMsg.remainingDeckCount = playerState.deck.length;
        returnMsg.cardType = cardType;
        returnMsg.validCards = validCards;
        returnMsg.baseScore = baseScore;
        returnMsg.multiplier = multiplier;
        if (returnMsg.gameOver) {
            returnMsg.settlement = {
                finalScore: blindState.currentBlindScore,
                targetScore: blindState.targetScore,
                result: blindState.currentBlindScore >= blindState.targetScore ? "WIN" : "LOSE",
            };
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

    private initGameState(playerId: string, gameState: GameState, playerState: PlayerState): GameState {
        const deck = this.pokerService.shuffleDeck(this.pokerService.getBaseDeck());
        let round = 1;
        let playsLeft: number = GAME_RULE.INITIAL_PLAYS_LEFT;
        let discardsLeft: number = GAME_RULE.INITIAL_DISCARDS_LEFT;
        if (gameState) {
            round = gameState.blindState.round + 1;
            playsLeft = playerState.playsLeft ?? GAME_RULE.INITIAL_PLAYS_LEFT;
            discardsLeft = playerState.discardsLeft ?? GAME_RULE.INITIAL_DISCARDS_LEFT;
        }
        this.gameStates[playerId] = {
            playerId: playerId,
            playerState: {
                deck: deck,
                hand: [],
                playsLeft,
                discardsLeft,
                handSize: GAME_RULE.DEFAULT_HAND_SIZE,
                currentActionScore: 0,
            },
            blindState: {
                round: round,
                ante: Math.floor((round - 1) / 3) + 1,
                blindType: "small",
                targetScore: GAME_RULE.INITIAL_TARGET_SCORE,
                currentBlindScore: 0,
            },
            gameStatus: "playing",
        };
        // Logger.log(`-${playerId}- initPlayerState: ${JSON.stringify(this.gameStates[playerId])}`);
        return this.gameStates[playerId];
    }

    private isGameOver(playerState: PlayerState, gameState: GameState): boolean {
        return playerState.playsLeft <= 0 || gameState.blindState.currentBlindScore >= gameState.blindState.targetScore;
    }
}
