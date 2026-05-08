import { GameService } from "./game.service";
import { PokerService } from "../poker/poker.service";
import { GAME_FLOW_CODE, PLAYER_STATE_CODE, REQUEST_PARAM_CODE, RESULT_CODE } from "./game.constants";

import type { GameState } from "./game.types";

describe("GameService", () => {
    let service: GameService;
    let poker: PokerService;

    beforeAll(() => {
        console.info("[GameService.spec] Running coverage for dealCards and selectCards flows.");
    });

    beforeEach(() => {
        poker = new PokerService();
        service = new GameService(poker);
        console.info(`[GameService.spec] Case: ${expect.getState().currentTestName}`);
    });

    function getGameState(playerId: string): GameState | undefined {
        return (service as unknown as { gameStates: Record<string, GameState> }).gameStates[playerId];
    }

    function dealInitialHand(playerId: string, handSize = 8) {
        return service.dealCards({ handSize, round: 1 }, playerId);
    }

    function getCardNotInHand(playerId: string): string {
        const hand = getGameState(playerId)?.hand ?? [];
        const allCards = poker.serializeCards(poker.getBaseDeck());
        const extraCard = allCards.find((card) => !hand.includes(card));

        if (!extraCard) {
            throw new Error("Expected to find a card that is not in the player's hand.");
        }

        return extraCard;
    }

    function getCurrentHand(playerId: string): string[] {
        const hand = getGameState(playerId)?.hand;

        if (!hand) {
            throw new Error(`Missing game state for player ${playerId}.`);
        }

        return hand;
    }

    describe("dealCards", () => {
        beforeAll(() => {
            console.info(
                "[GameService.spec] dealCards coverage: initial deal, card validity, state reuse, per-player isolation, round progression, missing player, deck exhaustion, zero handSize.",
            );
        });

        it("should initialize player state and return the requested number of cards", () => {
            const result = service.dealCards({ handSize: 5, round: 1 }, "p1");

            expect(result.hand).toHaveLength(5);
            expect(result.remainingDeckCount).toBe(52 - 5);
            expect(result.playsLeft).toBe(5);
        });

        it("should return only valid cards", () => {
            const validSuits = new Set(["H", "S", "D", "C"]);
            const { hand } = service.dealCards({ handSize: 8, round: 1 }, "p2");

            for (const card of hand) {
                const suit = card.slice(-1);
                const rankStr = card.slice(0, -1);
                const rankMap: Record<string, number> = { J: 11, Q: 12, K: 13, A: 14 };
                const rank = rankMap[rankStr] ?? Number(rankStr);

                expect(validSuits.has(suit)).toBe(true);
                expect(Number.isNaN(rank)).toBe(false);
                expect(rank).toBeGreaterThanOrEqual(2);
                expect(rank).toBeLessThanOrEqual(14);
            }
        });

        it("should reuse existing state when dealing again with round = 1", () => {
            service.dealCards({ handSize: 5, round: 1 }, "p3");
            const deckAfterFirst = getGameState("p3")!.deck.length;

            const result = service.dealCards({ handSize: 5, round: 1 }, "p3");

            expect(result.hand).toHaveLength(5);
            expect(result.remainingDeckCount).toBe(deckAfterFirst - 5);
        });

        it("should keep different players' states independent", () => {
            service.dealCards({ handSize: 5, round: 1 }, "playerA");
            service.dealCards({ handSize: 5, round: 1 }, "playerB");

            expect(getGameState("playerA")!.deck).toHaveLength(52 - 5);
            expect(getGameState("playerB")!.deck).toHaveLength(52 - 5);
        });

        it("should deal from the existing deck and update playsLeft", () => {
            service.dealCards({ handSize: 5, round: 1 }, "p4");
            const playsLeftBefore = getGameState("p4")!.playsLeft;

            const result = service.dealCards({ handSize: 5, round: 2 }, "p4");

            expect(result.hand).toHaveLength(5);
            expect(result.playsLeft).toBe(playsLeftBefore - 1);
            expect(result.remainingDeckCount).toBe(52 - 10);
        });

        it("should return an empty result if player state does not exist", () => {
            const result = service.dealCards({ handSize: 5, round: 2 }, "ghost");

            expect(result.hand).toHaveLength(0);
            expect(result.remainingDeckCount).toBe(0);
            expect(result.playsLeft).toBe(0);
        });

        it("should return all remaining cards when requested count exceeds deck size", () => {
            service.dealCards({ handSize: 50, round: 1 }, "p5");
            const result = service.dealCards({ handSize: 5, round: 2 }, "p5");

            expect(result.hand).toHaveLength(2);
            expect(result.remainingDeckCount).toBe(0);
        });

        it("should return an empty hand and keep deck unchanged when handSize is 0", () => {
            service.dealCards({ handSize: 5, round: 1 }, "p6");
            const deckBefore = getGameState("p6")!.deck.length;

            const result = service.dealCards({ handSize: 0, round: 2 }, "p6");

            expect(result.hand).toHaveLength(0);
            expect(result.remainingDeckCount).toBe(deckBefore);
        });
    });

    describe("selectCards", () => {
        beforeAll(() => {
            console.info(
                "[GameService.spec] selectCards coverage: missing player, empty selection, selection limit, invalid format, card not in hand, plays exhaustion, discards exhaustion, duplicate cards, successful play, successful discard.",
            );
        });

        it("should return NOT_FOUND when the player state does not exist", () => {
            dealInitialHand("known-player");

            const result = service.selectCards(["AH"], "play", "ghost-player");

            expect(result).toEqual({
                code: PLAYER_STATE_CODE.NOT_FOUND,
                selectedCards: ["AH"],
                hand: [],
                remainingDeckCount: 0,
                gameOver: false,
                playsLeft: 0,
                discardsLeft: 0,
            });
        });

        it("should return EMPTY_SELECTED_CARDS when no cards are selected", () => {
            const playerId = "empty-selection-player";
            dealInitialHand(playerId);

            const result = service.selectCards([], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.EMPTY_SELECTED_CARDS);
            expect(result.selectedCards).toEqual([]);
            expect(result.playsLeft).toBe(5);
            expect(result.discardsLeft).toBe(3);
        });

        it("should return CARDS_LIMIT_EXCEEDED when more than 5 cards are selected", () => {
            const playerId = "limit-player";
            const { hand } = dealInitialHand(playerId);

            const result = service.selectCards(hand.slice(0, 6), "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.CARDS_LIMIT_EXCEEDED);
            expect(result.selectedCards).toEqual(hand.slice(0, 6));
            expect(result.playsLeft).toBe(5);
            expect(result.discardsLeft).toBe(3);
        });

        it("should return INVALID_CARD_FORMAT when any selected card is malformed", () => {
            const playerId = "invalid-format-player";
            dealInitialHand(playerId);

            const result = service.selectCards(["ZZ"], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.INVALID_CARD_FORMAT);
            expect(result.selectedCards).toEqual(["ZZ"]);
            expect(result.playsLeft).toBe(5);
            expect(result.discardsLeft).toBe(3);
        });

        it("should return CARD_NOT_IN_HAND when a selected card is not in the current hand", () => {
            const playerId = "missing-card-player";
            dealInitialHand(playerId);
            const missingCard = getCardNotInHand(playerId);

            const result = service.selectCards([missingCard], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.CARD_NOT_IN_HAND);
            expect(result.selectedCards).toEqual([missingCard]);
            expect(result.playsLeft).toBe(5);
            expect(result.discardsLeft).toBe(3);
        });

        it("should return NO_PLAYS_LEFT after all plays are used", () => {
            const playerId = "no-plays-player";
            dealInitialHand(playerId);

            for (let i = 0; i < 5; i++) {
                const currentCard = getCurrentHand(playerId)[0];
                const result = service.selectCards([currentCard], "play", playerId);

                expect(result.code).toBe(RESULT_CODE.SUCCESS);
                expect(result.playsLeft).toBe(4 - i);
            }

            const blockedCard = getCurrentHand(playerId)[0];
            const blockedResult = service.selectCards([blockedCard], "play", playerId);

            expect(blockedResult.code).toBe(GAME_FLOW_CODE.NO_PLAYS_LEFT);
            expect(blockedResult.gameOver).toBe(true);
            expect(blockedResult.playsLeft).toBe(0);
            expect(blockedResult.discardsLeft).toBe(3);
        });

        it("should return NO_DISCARDS_LEFT after all discards are used", () => {
            const playerId = "no-discards-player";
            dealInitialHand(playerId);

            for (let i = 0; i < 3; i++) {
                const currentCard = getCurrentHand(playerId)[0];
                const result = service.selectCards([currentCard], "discard", playerId);

                expect(result.code).toBe(RESULT_CODE.SUCCESS);
                expect(result.discardsLeft).toBe(2 - i);
                expect(result.playsLeft).toBe(5);
            }

            const blockedCard = getCurrentHand(playerId)[0];
            const blockedResult = service.selectCards([blockedCard], "discard", playerId);

            expect(blockedResult.code).toBe(GAME_FLOW_CODE.NO_DISCARDS_LEFT);
            expect(blockedResult.gameOver).toBe(false);
            expect(blockedResult.playsLeft).toBe(5);
            expect(blockedResult.discardsLeft).toBe(0);
        });

        it("should return DUPLICATE_SELECTED_CARDS when the same card is submitted twice", () => {
            const playerId = "duplicate-card-player";
            const { hand } = dealInitialHand(playerId);
            const duplicateCard = hand[0];

            const result = service.selectCards([duplicateCard, duplicateCard], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.DUPLICATE_SELECTED_CARDS);
            expect(result.selectedCards).toEqual([duplicateCard, duplicateCard]);
            expect(result.playsLeft).toBe(5);
            expect(result.discardsLeft).toBe(3);
        });

        it("should play cards successfully and decrement playsLeft", () => {
            const playerId = "success-play-player";
            const { hand } = dealInitialHand(playerId);
            const selectedCards = hand.slice(0, 2);

            const result = service.selectCards(selectedCards, "play", playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.selectedCards).toEqual(selectedCards);
            expect(result.hand).toHaveLength(8);
            expect(result.playsLeft).toBe(4);
            expect(result.discardsLeft).toBe(3);
            expect(result.remainingDeckCount).toBe(42);
            expect(result.hand.some((card) => selectedCards.includes(card))).toBe(false);
        });

        it("should discard cards successfully and decrement discardsLeft only", () => {
            const playerId = "success-discard-player";
            const { hand } = dealInitialHand(playerId);
            const selectedCards = hand.slice(0, 2);

            const result = service.selectCards(selectedCards, "discard", playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.selectedCards).toEqual(selectedCards);
            expect(result.hand).toHaveLength(8);
            expect(result.playsLeft).toBe(5);
            expect(result.discardsLeft).toBe(2);
            expect(result.remainingDeckCount).toBe(42);
            expect(result.hand.some((card) => selectedCards.includes(card))).toBe(false);
        });
    });
});
