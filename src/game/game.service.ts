import { Injectable, Logger } from "@nestjs/common";
import { Card } from "../poker/poker.types";
import { PokerService } from "../poker/poker.service";
import { CARD_PATTERN } from "../poker/poker.constants";

import { GameState, PlayCardsResult, DealResult } from "./game.types";
import {
    RESULT_CODE,
    PLAYER_STATE_CODE,
    REQUEST_PARAM_CODE,
    GAME_FLOW_CODE,
    SELECT_CARD_ACTION,
    GAME_RULE,
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

    playCard(cards: string[]): number {
        const handType = this.pokerService.getCardType(cards);
        return handType;
    }

    // Temporary initial dealing method. It currently initializes player state and deals cards. This will be renamed or split into startGame/startRound when round settlement is introduced.
    dealCards(data: { handSize: number; round: number }, playerId: string): DealResult {
        let playerState: GameState;

        // Temporary round progression logic. This will be refactored when score calculation and round settlement are introduced.
        if (data.round === 1) {
            playerState = this.gameStates[playerId];
            if (!playerState) {
                playerState = this.initPlayerState(playerId);
            }
        } else {
            playerState = this.gameStates[playerId];
        }

        // Safety check: the player state should exist after the game starts.
        if (!playerState) {
            return { hand: [], remainingDeckCount: 0, playsLeft: 0 };
        }
        const deck = playerState.deck;
        const hand = this.pokerService.serializeCards(deck.splice(0, data.handSize));
        playerState.hand = hand;
        playerState.deck = deck;

        if (data.round != 1) playerState.playsLeft--;

        const dealResult = {
            hand,
            remainingDeckCount: playerState.deck.length,
            playsLeft: playerState.playsLeft,
        };

        return dealResult;
    }

    //统一处理出牌和弃牌：两者都会移除所选手牌并自动补牌，区别是扣减不同的操作次数。
    selectCards(selectedCards: string[], action: "play" | "discard", playerId: string): PlayCardsResult {
        const playerState: GameState = this.gameStates[playerId];
        if (!playerId || !playerState) {
            return this.buildSelectCardsResult(PLAYER_STATE_CODE.NOT_FOUND, selectedCards);
        }

        const handCards: string[] = playerState.hand;

        if (!selectedCards?.length) {
            return this.buildSelectCardsResult(REQUEST_PARAM_CODE.EMPTY_SELECTED_CARDS, selectedCards, playerState);
        }

        if (selectedCards?.length > GAME_RULE.MAX_SELECT_CARDS) {
            return this.buildSelectCardsResult(REQUEST_PARAM_CODE.CARDS_LIMIT_EXCEEDED, selectedCards, playerState);
        }

        const validCard = selectedCards.every((card) => CARD_PATTERN.test(card));
        if (!validCard) {
            return this.buildSelectCardsResult(REQUEST_PARAM_CODE.INVALID_CARD_FORMAT, selectedCards, playerState);
        }

        const selectedSet = new Set(selectedCards);
        if (selectedSet.size !== selectedCards.length) {
            return this.buildSelectCardsResult(REQUEST_PARAM_CODE.DUPLICATE_SELECTED_CARDS, selectedCards, playerState);
        }

        const existCards = selectedCards.every((item) => handCards.includes(item));
        if (!existCards) {
            return this.buildSelectCardsResult(REQUEST_PARAM_CODE.CARD_NOT_IN_HAND, selectedCards, playerState);
        }

        if (action !== SELECT_CARD_ACTION.PLAY && action !== SELECT_CARD_ACTION.DISCARD) {
            return this.buildSelectCardsResult(REQUEST_PARAM_CODE.INVALID_ACTION, selectedCards, playerState);
        }

        if (action == SELECT_CARD_ACTION.PLAY && playerState.playsLeft <= 0) {
            return this.buildSelectCardsResult(GAME_FLOW_CODE.NO_PLAYS_LEFT, selectedCards, playerState);
        }

        if (action == SELECT_CARD_ACTION.DISCARD && playerState.discardsLeft <= 0) {
            return this.buildSelectCardsResult(GAME_FLOW_CODE.NO_DISCARDS_LEFT, selectedCards, playerState);
        }

        const newHand = this.removeAndDrawCards(selectedCards, handCards, playerState);
        playerState.hand = newHand;
        if (action == SELECT_CARD_ACTION.PLAY) playerState.playsLeft--;
        if (action == SELECT_CARD_ACTION.DISCARD) playerState.discardsLeft--;

        const returnMsg = this.buildSelectCardsResult(RESULT_CODE.SUCCESS, selectedCards, playerState);
        // this.logger.log(
        //     `-${playerId}- user hand cards: ${JSON.stringify(playerState.hand)}, remaining cards: ${JSON.stringify(playerState.deck)}`,
        // );
        return returnMsg;
    }

    private buildSelectCardsResult(code: number, selectedCards: string[], playerState?: GameState): PlayCardsResult {
        let gameOver = false;
        if (playerState && playerState.playsLeft <= 0) {
            gameOver = true;
        }
        return {
            code,
            hand: playerState?.hand || [],
            playsLeft: playerState?.playsLeft ?? 0,
            discardsLeft: playerState?.discardsLeft ?? 0,
            remainingDeckCount: playerState?.deck.length || 0,
            selectedCards: selectedCards,
            gameOver,
        };
    }

    // Based on the current player state, remove selected cards from hand and draw the same number of cards from deck.
    private removeAndDrawCards(selectedCards: string[], handCards: string[], playerState: GameState): string[] {
        const newHand: string[] = [];
        const deck: Card[] = playerState.deck;
        for (let i = 0; i < handCards.length; i++) {
            if (!selectedCards.includes(handCards[i])) {
                newHand.push(handCards[i]);
            }
        }

        const getSize: number = playerState.handSize - newHand.length;
        const getDeck: string[] = this.pokerService.serializeCards(deck.splice(0, getSize));

        newHand.push(...getDeck);
        return newHand;
    }

    private initPlayerState(playerId: string): GameState {
        const deck = this.pokerService.shuffleDeck(this.pokerService.getBaseDeck());
        this.gameStates[playerId] = {
            playerId: playerId,
            deck: deck,
            hand: [],
            playsLeft: GAME_RULE.INITIAL_PLAYS_LEFT,
            discardsLeft: GAME_RULE.INITIAL_DISCARDS_LEFT,
            round: 1,
            score: 0,
            handSize: GAME_RULE.DEFAULT_HAND_SIZE,
        };
        // Logger.log(`-${playerId}- initPlayerState: ${JSON.stringify(this.gameStates[playerId])}`);
        return this.gameStates[playerId];
    }
}
