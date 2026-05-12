import { GameService } from "./game.service";
import { PokerService } from "../poker/poker.service";
import {
    GAME_FLOW_CODE,
    GAME_STATE_CODE,
    PLAYER_STATE_CODE,
    REQUEST_PARAM_CODE,
    RESULT_CODE,
    GAME_RULE,
} from "./game.constants";

import type { GameState } from "./game.types";

describe("GameService", () => {
    let service: GameService;
    let poker: PokerService;

    beforeAll(() => {
        console.info("[GameService.spec] Running coverage for startGame and selectCards flows.");
    });

    beforeEach(() => {
        poker = new PokerService();
        service = new GameService(poker);
        console.info(`[GameService.spec] Case: ${expect.getState().currentTestName}`);
    });

    function getGameState(playerId: string): GameState | undefined {
        return (service as unknown as { gameStates: Record<string, GameState> }).gameStates[playerId];
    }

    function startGameAndGetHand(playerId: string) {
        return service.startGame(playerId);
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

    describe("startGame", () => {
        it("should initialize player state and deal initial hand successfully", () => {
            const playerId = "player-start-success";

            const result = service.startGame(playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            expect(result.remainingDeckCount).toBe(52 - GAME_RULE.DEFAULT_HAND_SIZE);
            expect(result.playsLeft).toBe(GAME_RULE.INITIAL_PLAYS_LEFT);
            expect(result.discardsLeft).toBe(GAME_RULE.INITIAL_DISCARDS_LEFT);

            const state = getGameState(playerId);
            expect(state).toBeDefined();
            expect(state?.gameStatus).toBe("playing");
            expect(state?.round).toBe(1);
            expect(state?.totalScore).toBe(0);
            expect(state?.currentActionScore).toBe(0);
            expect(state?.targetScore).toBe(GAME_RULE.INITIAL_TARGET_SCORE);
        });

        it("should return GAME_ALREADY_STARTED when same player starts again in same round", () => {
            const playerId = "player-double-start";
            const first = service.startGame(playerId);

            const second = service.startGame(playerId);

            expect(first.code).toBe(RESULT_CODE.SUCCESS);
            expect(second.code).toBe(GAME_STATE_CODE.GAME_ALREADY_STARTED);
            expect(second.hand).toEqual(first.hand);
            expect(second.remainingDeckCount).toBe(first.remainingDeckCount);
        });

        it("should deal hand cards sorted by rank in descending order", () => {
            const playerId = "player-sort-hand";

            const result = service.startGame(playerId);

            expect(result.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            // Verify cards are sorted descending by rank (A=14, K=13, ..., 2=2)
            for (let i = 0; i < result.hand!.length - 1; i++) {
                const currentRank = poker.getCardRank(result.hand![i]);
                const nextRank = poker.getCardRank(result.hand![i + 1]);
                expect(currentRank).toBeGreaterThanOrEqual(nextRank);
            }
        });
    });

    describe("selectCards", () => {
        beforeAll(() => {
            console.info(
                "[GameService.spec] selectCards coverage: missing player, empty selection, selection limit, invalid format, card not in hand, plays exhaustion, discards exhaustion, duplicate cards, successful play, successful discard.",
            );
        });

        it("should return NOT_FOUND when player state does not exist", () => {
            const result = service.selectCards(["AH"], "play", "non-existent-player");

            expect(result.code).toBe(PLAYER_STATE_CODE.NOT_FOUND);
            expect(result.selectedCards).toEqual(["AH"]);
            expect(result.playerState).toBeUndefined();
        });

        it("should return EMPTY_SELECTED_CARDS when no cards are selected", () => {
            const playerId = "empty-selection-player";
            startGameAndGetHand(playerId);

            const result = service.selectCards([], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.EMPTY_SELECTED_CARDS);
            expect(result.selectedCards).toEqual([]);
        });

        it("should return CARDS_LIMIT_EXCEEDED when more than 5 cards are selected", () => {
            const playerId = "limit-player";
            const { hand } = startGameAndGetHand(playerId);

            const result = service.selectCards(hand!.slice(0, 6), "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.CARDS_LIMIT_EXCEEDED);
            expect(result.selectedCards).toEqual(hand!.slice(0, 6));
        });

        it("should return INVALID_CARD_FORMAT when card format is malformed", () => {
            const playerId = "invalid-format-player";
            startGameAndGetHand(playerId);

            const result = service.selectCards(["ZZ"], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.INVALID_CARD_FORMAT);
            expect(result.selectedCards).toEqual(["ZZ"]);
        });

        it("should return CARD_NOT_IN_HAND when selected card is not in current hand", () => {
            const playerId = "missing-card-player";
            startGameAndGetHand(playerId);
            const missingCard = getCardNotInHand(playerId);

            const result = service.selectCards([missingCard], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.CARD_NOT_IN_HAND);
            expect(result.selectedCards).toEqual([missingCard]);
        });

        it("should return DUPLICATE_SELECTED_CARDS when same card submitted twice", () => {
            const playerId = "duplicate-card-player";
            const { hand } = startGameAndGetHand(playerId);
            const duplicateCard = hand![0];

            const result = service.selectCards([duplicateCard, duplicateCard], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.DUPLICATE_SELECTED_CARDS);
            expect(result.selectedCards).toEqual([duplicateCard, duplicateCard]);
        });

        it("should end game when all plays are used", () => {
            const playerId = "no-plays-player";
            startGameAndGetHand(playerId);

            // Use up all plays - each play increments until game ends
            for (let i = 0; i < GAME_RULE.INITIAL_PLAYS_LEFT; i++) {
                const currentHand = getCurrentHand(playerId);
                service.selectCards([currentHand[0]], "play", playerId);
            }

            // After all plays are used, game should be finished
            const state = getGameState(playerId);
            expect(state?.gameStatus).toBe("finished");
            expect(state?.playsLeft).toBe(0);
        });

        it("should return NO_DISCARDS_LEFT when attempting discard with no discards remaining", () => {
            const playerId = "no-discards-player";
            startGameAndGetHand(playerId);

            // Use up all discards
            for (let i = 0; i < GAME_RULE.INITIAL_DISCARDS_LEFT; i++) {
                const currentHand = getCurrentHand(playerId);
                service.selectCards([currentHand[0]], "discard", playerId);
            }

            // Now that discards are exhausted, attempt another discard
            const currentHand = getCurrentHand(playerId);
            if (currentHand.length > 0) {
                const blockedResult = service.selectCards([currentHand[0]], "discard", playerId);
                expect(blockedResult.code).toBe(GAME_FLOW_CODE.NO_DISCARDS_LEFT);
            }
        });

        it("should play cards successfully and decrement playsLeft", () => {
            const playerId = "success-play-player";
            const { hand } = startGameAndGetHand(playerId);
            const selectedCards = hand!.slice(0, 2);

            const result = service.selectCards(selectedCards, "play", playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.selectedCards).toEqual(selectedCards);
            expect(result.playerState?.playsLeft).toBe(GAME_RULE.INITIAL_PLAYS_LEFT - 1);
            expect(result.playerState?.discardsLeft).toBe(GAME_RULE.INITIAL_DISCARDS_LEFT);
            expect(result.playerState?.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            expect(result.gameOver).toBe(false);
            expect(result.cardType).toBeDefined();
            expect(result.baseScore).toBeDefined();
            expect(result.multiplier).toBeDefined();
        });

        it("should discard cards successfully and decrement discardsLeft only", () => {
            const playerId = "success-discard-player";
            const { hand } = startGameAndGetHand(playerId);
            const selectedCards = hand!.slice(0, 2);

            const result = service.selectCards(selectedCards, "discard", playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.selectedCards).toEqual(selectedCards);
            expect(result.playerState?.playsLeft).toBe(GAME_RULE.INITIAL_PLAYS_LEFT);
            expect(result.playerState?.discardsLeft).toBe(GAME_RULE.INITIAL_DISCARDS_LEFT - 1);
            expect(result.playerState?.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            expect(result.gameOver).toBe(false);
        });

        it("should end game when plays are exhausted", () => {
            const playerId = "game-end-plays-player";
            startGameAndGetHand(playerId);

            let lastResult = null;
            for (let i = 0; i < GAME_RULE.INITIAL_PLAYS_LEFT; i++) {
                const currentHand = getCurrentHand(playerId);
                lastResult = service.selectCards([currentHand[0]], "play", playerId);
            }

            expect(lastResult?.gameOver).toBe(true);
            expect(lastResult?.settlement).toBeDefined();
            expect(lastResult?.settlement?.finalScore).toBeDefined();
            expect(lastResult?.settlement?.targetScore).toBe(GAME_RULE.INITIAL_TARGET_SCORE);
            expect(lastResult?.playerState?.gameStatus).toBe("finished");
        });

        it("should have settlement structure when game ends", () => {
            const playerId = "game-end-score-player";
            startGameAndGetHand(playerId);

            // Play until game ends
            let lastResult = null;
            for (let i = 0; i < GAME_RULE.INITIAL_PLAYS_LEFT; i++) {
                const currentHand = getCurrentHand(playerId);
                lastResult = service.selectCards([currentHand[0]], "play", playerId);
            }

            // After game ends, settlement should be present in final result
            expect(lastResult?.gameOver).toBe(true);
            expect(lastResult?.settlement).toBeDefined();
            expect(lastResult?.settlement?.finalScore).toBeDefined();
            expect(lastResult?.settlement?.targetScore).toBe(GAME_RULE.INITIAL_TARGET_SCORE);
            expect(lastResult?.settlement?.result).toMatch(/^(WIN|LOSE)$/);
        });

        it("should track currentActionScore and totalScore correctly", () => {
            const playerId = "score-tracking-player";
            startGameAndGetHand(playerId);

            const initialState = getGameState(playerId);
            expect(initialState?.totalScore).toBe(0);

            const currentHand = getCurrentHand(playerId);
            const result = service.selectCards([currentHand[0]], "play", playerId);

            expect(result.playerState?.currentActionScore).toBeGreaterThanOrEqual(0);
            expect(result.playerState?.totalScore).toBeGreaterThanOrEqual(0);
        });

        it("should maintain hand size after each action by drawing from deck", () => {
            const playerId = "hand-size-player";
            const dealResult = startGameAndGetHand(playerId);
            const initialDeckCount = dealResult.remainingDeckCount!;

            const currentHand = getCurrentHand(playerId);
            const result = service.selectCards(currentHand.slice(0, 3), "play", playerId);

            expect(result.playerState?.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            expect(result.remainingDeckCount!).toBe(initialDeckCount - 3);
        });

        it("should prevent action when game is already finished", () => {
            const playerId = "finished-game-player";
            startGameAndGetHand(playerId);

            // Manually set game to finished
            const state = getGameState(playerId);
            if (state) {
                state.gameStatus = "finished";
                state.playsLeft = 0;
            }

            const result = service.selectCards(["AH"], "play", playerId);

            expect(result.code).toBe(GAME_STATE_CODE.GAME_ALREADY_FINISHED);
        });
    });
});
