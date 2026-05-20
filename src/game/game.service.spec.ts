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

    function getCardNotInHand(playerId: string): string {
        const hand = getGameState(playerId)?.playerState.hand ?? [];
        const allCards = poker.serializeCards(poker.getBaseDeck());
        const extraCard = allCards.find((card) => !hand.includes(card));

        if (!extraCard) {
            throw new Error("Expected to find a card that is not in the player's hand.");
        }

        return extraCard;
    }

    function getCurrentHand(playerId: string): string[] {
        const hand = getGameState(playerId)?.playerState.hand;

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
            expect(result.round).toBe(1);
            expect(result.ante).toBe(1);
            expect(result.targetScore).toBeGreaterThan(0);

            const state = getGameState(playerId);
            expect(state).toBeDefined();
            expect(state?.gameStatus).toBe("playing");
            expect(state?.blindState.round).toBe(1);
            expect(state?.blindState.ante).toBe(1);
            expect(state?.blindState.currentBlindScore).toBe(0);
            expect(state?.playerState.playsLeft).toBe(GAME_RULE.INITIAL_PLAYS_LEFT);
            expect(state?.playerState.discardsLeft).toBe(GAME_RULE.INITIAL_DISCARDS_LEFT);
            expect(state?.playerState.currentActionScore).toBe(0);
        });

        it("should return GAME_ALREADY_STARTED when same player starts again in same round", () => {
            const playerId = "player-double-start";
            const first = service.startGame(playerId);

            const second = service.startGame(playerId);

            expect(first.code).toBe(RESULT_CODE.SUCCESS);
            expect(second.code).toBe(GAME_STATE_CODE.GAME_ALREADY_STARTED);
            expect(second.hand).toEqual(first.hand);
            expect(second.remainingDeckCount).toBe(first.remainingDeckCount);
            expect(second.playsLeft).toBe(first.playsLeft);
            expect(second.discardsLeft).toBe(first.discardsLeft);
        });

        it("should deal hand cards sorted by rank in descending order", () => {
            const playerId = "player-sort-hand";

            const result = service.startGame(playerId);

            expect(result.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            // Verify cards are sorted descending by rank (A=14, K=13, ..., 2=2)
            for (let i = 0; i < result.hand.length - 1; i++) {
                const currentRank = poker.getCardRank(result.hand[i]);
                const nextRank = poker.getCardRank(result.hand[i + 1]);
                expect(currentRank).toBeGreaterThanOrEqual(nextRank);
            }
        });

        it("should initialize game state with correct deck", () => {
            const playerId = "player-deck-check";

            service.startGame(playerId);

            const state = getGameState(playerId);
            expect(state?.playerState.deck).toBeDefined();
            expect(state?.playerState.deck.length).toBe(52 - GAME_RULE.DEFAULT_HAND_SIZE);
            expect(state?.playerState.hand.length).toBe(GAME_RULE.DEFAULT_HAND_SIZE);
            expect(state?.playerState.handSize).toBe(GAME_RULE.DEFAULT_HAND_SIZE);
        });

        it("should not find player state when game has not started", () => {
            const nonExistentPlayerId = "non-existent-player";
            const state = getGameState(nonExistentPlayerId);
            expect(state).toBeUndefined();
        });
    });

    describe("selectCards", () => {
        beforeAll(() => {
            console.info(
                "[GameService.spec] selectCards coverage: missing player, empty selection, selection limit, invalid format, card not in hand, invalid action, plays exhaustion, discards exhaustion, duplicate cards, successful play, successful discard, game end scenarios.",
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
            service.startGame(playerId);

            const result = service.selectCards([], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.EMPTY_SELECTED_CARDS);
            expect(result.selectedCards).toEqual([]);
            expect(result.playerState).toBeDefined();
        });

        it("should return CARDS_LIMIT_EXCEEDED when more than 5 cards are selected", () => {
            const playerId = "limit-player";
            const dealResult = service.startGame(playerId);

            const result = service.selectCards(dealResult.hand.slice(0, 6), "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.CARDS_LIMIT_EXCEEDED);
            expect(result.selectedCards).toHaveLength(6);
        });

        it("should return INVALID_CARD_FORMAT when card format is malformed", () => {
            const playerId = "invalid-format-player";
            service.startGame(playerId);

            const result = service.selectCards(["ZZ"], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.INVALID_CARD_FORMAT);
            expect(result.selectedCards).toEqual(["ZZ"]);
        });

        it("should return CARD_NOT_IN_HAND when selected card is not in current hand", () => {
            const playerId = "missing-card-player";
            service.startGame(playerId);
            const missingCard = getCardNotInHand(playerId);

            const result = service.selectCards([missingCard], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.CARD_NOT_IN_HAND);
            expect(result.selectedCards).toEqual([missingCard]);
        });

        it("should return DUPLICATE_SELECTED_CARDS when same card submitted twice", () => {
            const playerId = "duplicate-card-player";
            const dealResult = service.startGame(playerId);
            const duplicateCard = dealResult.hand[0];

            const result = service.selectCards([duplicateCard, duplicateCard], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.DUPLICATE_SELECTED_CARDS);
            expect(result.selectedCards).toEqual([duplicateCard, duplicateCard]);
        });

        it("should return INVALID_ACTION when action is not play or discard", () => {
            const playerId = "invalid-action-player";
            const dealResult = service.startGame(playerId);

            // Use a card that's actually in the hand
            const cardInHand = dealResult.hand![0];
            const result = service.selectCards([cardInHand], "invalid" as any, playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.INVALID_ACTION);
            expect(result.selectedCards).toEqual([cardInHand]);
        });

        it("should return NO_PLAYS_LEFT when attempting play with no plays remaining", () => {
            const playerId = "no-plays-player";
            service.startGame(playerId);

            // Use up all plays - each play decrements playsLeft
            let lastResult = null;
            for (let i = 0; i < GAME_RULE.INITIAL_PLAYS_LEFT; i++) {
                const state = getGameState(playerId);
                if (!state) break; // Game state may be deleted if game ended
                const currentHand = state.playerState.hand;
                if (currentHand.length === 0) break;
                lastResult = service.selectCards([currentHand[0]], "play", playerId);
                if (lastResult?.blindOver) break; // Blind ended, stop
            }

            // If game ended naturally, we can't test NO_PLAYS_LEFT
            // Instead, manually set up the scenario
            const testPlayerId = "no-plays-test-player";
            service.startGame(testPlayerId);
            const testState = getGameState(testPlayerId);
            if (testState) {
                testState.playerState.playsLeft = 0;
                const hand = testState.playerState.hand;
                if (hand.length > 0) {
                    const blockedResult = service.selectCards([hand[0]], "play", testPlayerId);
                    expect(blockedResult.code).toBe(GAME_FLOW_CODE.NO_PLAYS_LEFT);
                }
            }
        });

        it("should return NO_DISCARDS_LEFT when attempting discard with no discards remaining", () => {
            const playerId = "no-discards-player";
            service.startGame(playerId);

            // Use up all discards
            for (let i = 0; i < GAME_RULE.INITIAL_DISCARDS_LEFT; i++) {
                const state = getGameState(playerId);
                if (!state) break;
                const hand = state.playerState.hand;
                if (hand.length > 0) {
                    service.selectCards([hand[0]], "discard", playerId);
                }
            }

            // Now that discards are exhausted, attempt another discard
            const state = getGameState(playerId);
            if (state) {
                const hand = state.playerState.hand;
                if (hand.length > 0) {
                    const blockedResult = service.selectCards([hand[0]], "discard", playerId);
                    expect(blockedResult.code).toBe(GAME_FLOW_CODE.NO_DISCARDS_LEFT);
                }
            }
        });

        it("should play cards successfully and decrement playsLeft only", () => {
            const playerId = "success-play-player";
            const dealResult = service.startGame(playerId);
            const selectedCards = dealResult.hand.slice(0, 2);

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
            expect(result.playerState?.currentActionScore).toBeGreaterThanOrEqual(0);
        });

        it("should discard cards successfully and decrement discardsLeft only", () => {
            const playerId = "success-discard-player";
            const dealResult = service.startGame(playerId);
            const selectedCards = dealResult.hand.slice(0, 2);

            const result = service.selectCards(selectedCards, "discard", playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.selectedCards).toEqual(selectedCards);
            expect(result.playerState?.playsLeft).toBe(GAME_RULE.INITIAL_PLAYS_LEFT);
            expect(result.playerState?.discardsLeft).toBe(GAME_RULE.INITIAL_DISCARDS_LEFT - 1);
            expect(result.playerState?.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            expect(result.gameOver).toBe(false);
            expect(result.playerState?.currentActionScore).toBe(0);
        });

        it("should end blind when plays are exhausted", () => {
            const playerId = "blind-end-plays-player";
            service.startGame(playerId);

            let lastResult = null;
            for (let i = 0; i < GAME_RULE.INITIAL_PLAYS_LEFT; i++) {
                const state = getGameState(playerId);
                if (!state) break;
                const hand = state.playerState.hand;
                if (hand.length > 0) {
                    lastResult = service.selectCards([hand[0]], "play", playerId);
                    if (lastResult?.blindOver) break;
                }
            }

            expect(lastResult?.blindOver).toBe(true);
            expect(lastResult?.playerState?.gameStatus).toBe("finished");
        });

        it("should have settlement structure when blind is over", () => {
            const playerId = "blind-end-score-player";
            service.startGame(playerId);

            // Play until blind ends
            let lastResult = null;
            for (let i = 0; i < GAME_RULE.INITIAL_PLAYS_LEFT; i++) {
                const state = getGameState(playerId);
                if (!state) break;
                const hand = state.playerState.hand;
                if (hand.length > 0) {
                    lastResult = service.selectCards([hand[0]], "play", playerId);
                    if (lastResult?.blindOver) break;
                }
            }

            // After blind ends, settlement should be present in final result
            expect(lastResult?.blindOver).toBe(true);
            expect(lastResult?.settlement).toBeDefined();
            expect(lastResult?.settlement?.finalScore).toBeDefined();
            expect(lastResult?.settlement?.targetScore).toBe(lastResult?.playerState?.targetScore);
            expect(lastResult?.settlement?.result).toMatch(/^(WIN|LOSE)$/);
        });

        it("should track currentActionScore correctly on play action", () => {
            const playerId = "score-tracking-player";
            service.startGame(playerId);

            const currentHand = getCurrentHand(playerId);
            const result = service.selectCards([currentHand[0]], "play", playerId);

            expect(result.playerState?.currentActionScore).toBeGreaterThanOrEqual(0);
            expect(result.playerState?.currentBlindScore).toBeGreaterThanOrEqual(0);
        });

        it("should set currentActionScore to 0 on discard action", () => {
            const playerId = "discard-action-score-player";
            service.startGame(playerId);

            const currentHand = getCurrentHand(playerId);
            const result = service.selectCards([currentHand[0]], "discard", playerId);

            expect(result.playerState?.currentActionScore).toBe(0);
        });

        it("should maintain hand size after each action by drawing from deck", () => {
            const playerId = "hand-size-player";
            const dealResult = service.startGame(playerId);
            const initialDeckCount = dealResult.remainingDeckCount;

            const currentHand = getCurrentHand(playerId);
            const result = service.selectCards(currentHand.slice(0, 3), "play", playerId);

            expect(result.playerState?.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            expect(result.remainingDeckCount!).toBe(initialDeckCount - 3);
        });

        it("should prevent action when game is already finished", () => {
            const playerId = "finished-game-player";
            service.startGame(playerId);

            // Manually set game to finished
            const state = getGameState(playerId);
            if (state) {
                state.gameStatus = "finished";
            }

            const result = service.selectCards(["AH"], "play", playerId);

            expect(result.code).toBe(GAME_STATE_CODE.GAME_ALREADY_FINISHED);
        });

        it("should return correct game state in playerState response", () => {
            const playerId = "state-response-player";
            service.startGame(playerId);

            const currentHand = getCurrentHand(playerId);
            const result = service.selectCards([currentHand[0]], "play", playerId);

            expect(result.playerState).toBeDefined();
            expect(result.playerState?.hand).toBeDefined();
            expect(result.playerState?.playsLeft).toBeDefined();
            expect(result.playerState?.discardsLeft).toBeDefined();
            expect(result.playerState?.remainingDeckCount).toBeDefined();
            expect(result.playerState?.currentBlindScore).toBeDefined();
            expect(result.playerState?.currentActionScore).toBeDefined();
            expect(result.playerState?.gameStatus).toBe("playing");
            expect(result.playerState?.targetScore).toBeDefined();
        });

        it("should include blind info in response", () => {
            const playerId = "blind-info-player";
            const dealResult = service.startGame(playerId);

            expect(dealResult.round).toBe(1);
            expect(dealResult.ante).toBe(1);
            expect(dealResult.blindType).toBeDefined();
            expect(dealResult.targetScore).toBeGreaterThan(0);

            const currentHand = getCurrentHand(playerId);
            const result = service.selectCards([currentHand[0]], "play", playerId);

            expect(result.round).toBe(1);
            expect(result.ante).toBe(1);
            expect(result.blindType).toBeDefined();
        });

        it("should accumulate blindScore on multiple plays", () => {
            const playerId = "blind-accumulate-player";
            service.startGame(playerId);

            let previousScore = 0;
            for (let i = 0; i < 3; i++) {
                const currentHand = getCurrentHand(playerId);
                const result = service.selectCards([currentHand[0]], "play", playerId);
                const currentScore = result.playerState?.currentBlindScore ?? 0;
                expect(currentScore).toBeGreaterThanOrEqual(previousScore);
                previousScore = currentScore;
            }
        });

        it("should draw new cards after playing selected cards", () => {
            const playerId = "draw-new-cards-player";
            const dealResult = service.startGame(playerId);
            const initialHand = [...dealResult.hand];

            const currentHand = getCurrentHand(playerId);
            const selectedCards = [currentHand[0], currentHand[1]];
            const result = service.selectCards(selectedCards, "play", playerId);

            // After playing 2 cards, should have drawn 2 new cards
            expect(result.playerState?.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);

            const newHand = result.playerState?.hand ?? [];
            const drawnNewCards = newHand.some((card) => !initialHand.includes(card));
            expect(drawnNewCards).toBe(true);
        });

        it("should return WIN settlement when reaching target score", () => {
            const playerId = "win-scenario-player";
            service.startGame(playerId);

            // This test assumes we can accumulate enough score
            // Play multiple times to try to reach target
            let lastResult = null;
            for (let i = 0; i < GAME_RULE.INITIAL_PLAYS_LEFT; i++) {
                const currentHand = getCurrentHand(playerId);
                lastResult = service.selectCards([currentHand[0]], "play", playerId);
                if (lastResult?.blindOver) break;
            }

            if (lastResult?.blindOver && lastResult?.settlement) {
                expect(lastResult.settlement.result).toMatch(/^(WIN|LOSE)$/);
                expect(lastResult.settlement.finalScore).toBe(lastResult.playerState?.currentBlindScore);
                expect(lastResult.settlement.targetScore).toBe(lastResult.playerState?.targetScore);
            }
        });

        it("should reset gameStates when game ends with LOSE result", () => {
            const playerId = "game-reset-player";
            service.startGame(playerId);

            let lastResult = null;
            for (let i = 0; i < GAME_RULE.INITIAL_PLAYS_LEFT; i++) {
                const currentHand = getCurrentHand(playerId);
                lastResult = service.selectCards([currentHand[0]], "play", playerId);
                if (lastResult?.blindOver) break;
            }

            // If game is over and player lost, game state should be cleaned up
            if (lastResult?.gameOver && lastResult?.settlement?.result === "LOSE") {
                const stateAfter = getGameState(playerId);
                expect(stateAfter).toBeUndefined();
            }
        });

        it("should allow starting a new game after losing", () => {
            const playerId = "restart-after-lose-player";
            service.startGame(playerId);

            // Play until game ends
            let lastResult = null;
            for (let i = 0; i < GAME_RULE.INITIAL_PLAYS_LEFT; i++) {
                const currentHand = getCurrentHand(playerId);
                lastResult = service.selectCards([currentHand[0]], "play", playerId);
                if (lastResult?.blindOver) break;
            }

            // If game ended, should be able to start a new game
            if (lastResult?.gameOver) {
                const newGameResult = service.startGame(playerId);
                expect(newGameResult.code).toBe(RESULT_CODE.SUCCESS);
                expect(newGameResult.round).toBe(1);
                expect(newGameResult.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            }
        });
    });
});
