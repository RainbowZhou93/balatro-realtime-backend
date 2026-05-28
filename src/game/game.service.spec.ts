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
        it("should return GAME_NOT_FOUND when startGame is called before initGame", () => {
            const result = service.startGame("missing-player");

            expect(result.code).toBe(GAME_STATE_CODE.GAME_NOT_FOUND);
            expect(result.playerState).toBeUndefined();
            expect(result.blindState).toBeUndefined();
            expect(result.message).toBeDefined();
        });

        it("should deal initial hand successfully after initGame", () => {
            const playerId = "player-start-success";
            service.initGame(playerId);

            const result = service.startGame(playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.playerState?.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            expect(result.playerState?.remainingDeckCount).toBe(52 - GAME_RULE.DEFAULT_HAND_SIZE);
            expect(result.playerState?.playsLeft).toBe(GAME_RULE.INITIAL_PLAYS_LEFT);
            expect(result.playerState?.discardsLeft).toBe(GAME_RULE.INITIAL_DISCARDS_LEFT);
            expect(result.blindState?.round).toBe(1);
            expect(result.blindState?.ante).toBe(1);
            expect(result.blindState?.targetScore).toBeGreaterThan(0);
            expect(result.blindState?.currentAnteConfig).toBeDefined();

            const state = getGameState(playerId);
            expect(state?.gameStatus).toBe("playing");
            expect(state?.playerState.hand).toEqual(result.playerState?.hand);
            expect(state?.blindState.currentBlindScore).toBe(0);
        });

        it("should return GAME_ALREADY_STARTED when called again while playing", () => {
            const playerId = "player-double-start";
            service.initGame(playerId);
            const first = service.startGame(playerId);

            const second = service.startGame(playerId);

            expect(first.code).toBe(RESULT_CODE.SUCCESS);
            expect(second.code).toBe(GAME_STATE_CODE.GAME_ALREADY_STARTED);
            expect(second.playerState?.hand).toEqual(first.playerState?.hand);
            expect(second.playerState?.remainingDeckCount).toBe(first.playerState?.remainingDeckCount);
            expect(second.playerState?.playsLeft).toBe(first.playerState?.playsLeft);
            expect(second.playerState?.discardsLeft).toBe(first.playerState?.discardsLeft);
        });

        it("should deal cards sorted by rank in descending order", () => {
            const playerId = "player-sort-hand";
            service.initGame(playerId);

            const result = service.startGame(playerId);
            const hand = result.playerState?.hand ?? [];

            expect(hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            for (let i = 0; i < hand.length - 1; i++) {
                const currentRank = poker.getCardRank(hand[i]);
                const nextRank = poker.getCardRank(hand[i + 1]);
                expect(currentRank).toBeGreaterThanOrEqual(nextRank);
            }
        });

        it("should reset playable round fields when restarting from finished state", () => {
            const playerId = "player-restart-finished";
            service.initGame(playerId);
            service.startGame(playerId);

            const state = getGameState(playerId);
            expect(state).toBeDefined();
            if (!state) return;

            state.gameStatus = "finished";
            state.playerState.playsLeft = 0;
            state.playerState.discardsLeft = 0;
            state.playerState.currentActionScore = 999;
            state.blindState.currentBlindScore = 999;

            const restarted = service.startGame(playerId);

            expect(restarted.code).toBe(RESULT_CODE.SUCCESS);
            expect(restarted.playerState?.playsLeft).toBe(GAME_RULE.INITIAL_PLAYS_LEFT);
            expect(restarted.playerState?.discardsLeft).toBe(GAME_RULE.INITIAL_DISCARDS_LEFT);

            const newState = getGameState(playerId);
            expect(newState?.gameStatus).toBe("playing");
            expect(newState?.playerState.currentActionScore).toBe(0);
            expect(newState?.blindState.currentBlindScore).toBe(0);
            expect(newState?.playerState.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            expect(newState?.playerState.deck.length).toBe(52 - GAME_RULE.DEFAULT_HAND_SIZE);
        });
    });

    describe("selectCards", () => {
        beforeAll(() => {
            console.info(
                "[GameService.spec] selectCards coverage: state checks, validation checks, play/discard success, and blind settlement branches.",
            );
        });

        function initAndStart(playerId: string) {
            service.initGame(playerId);
            return service.startGame(playerId);
        }

        it("should return NOT_FOUND when game state does not exist", () => {
            const result = service.selectCards(["AH"], "play", "non-existent-player");

            expect(result.code).toBe(PLAYER_STATE_CODE.NOT_FOUND);
            expect(result.message).toBeDefined();
            expect(result.action).toBe("play");
            expect(result.playerState).toBeUndefined();
        });

        it("should return GAME_NOT_STARTED when game is initialized but not started", () => {
            const playerId = "initialized-only-player";
            service.initGame(playerId);

            const result = service.selectCards(["AH"], "play", playerId);

            expect(result.code).toBe(GAME_STATE_CODE.GAME_NOT_STARTED);
            expect(result.action).toBe("play");
        });

        it("should return EMPTY_SELECTED_CARDS when no cards are selected", () => {
            const playerId = "empty-selection-player";
            initAndStart(playerId);

            const result = service.selectCards([], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.EMPTY_SELECTED_CARDS);
            expect(result.action).toBe("play");
        });

        it("should return CARDS_LIMIT_EXCEEDED when more than 5 cards are selected", () => {
            const playerId = "limit-player";
            const dealResult = initAndStart(playerId);
            const hand = dealResult.playerState?.hand ?? [];

            const result = service.selectCards(hand.slice(0, 6), "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.CARDS_LIMIT_EXCEEDED);
            expect(result.action).toBe("play");
        });

        it("should return INVALID_CARD_FORMAT when card format is malformed", () => {
            const playerId = "invalid-format-player";
            initAndStart(playerId);

            const result = service.selectCards(["ZZ"], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.INVALID_CARD_FORMAT);
        });

        it("should return CARD_NOT_IN_HAND when selected card is not in current hand", () => {
            const playerId = "missing-card-player";
            initAndStart(playerId);
            const missingCard = getCardNotInHand(playerId);

            const result = service.selectCards([missingCard], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.CARD_NOT_IN_HAND);
        });

        it("should return DUPLICATE_SELECTED_CARDS when same card submitted twice", () => {
            const playerId = "duplicate-card-player";
            const dealResult = initAndStart(playerId);
            const duplicateCard = dealResult.playerState?.hand?.[0] ?? "AH";

            const result = service.selectCards([duplicateCard, duplicateCard], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.DUPLICATE_SELECTED_CARDS);
        });

        it("should return INVALID_ACTION when action is not play or discard", () => {
            const playerId = "invalid-action-player";
            const dealResult = initAndStart(playerId);

            const cardInHand = dealResult.playerState?.hand?.[0] ?? "AH";
            const result = service.selectCards([cardInHand], "invalid" as any, playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.INVALID_ACTION);
        });

        it("should return NO_PLAYS_LEFT when attempting play with no plays remaining", () => {
            const playerId = "no-plays-test-player";
            const dealResult = initAndStart(playerId);
            const testState = getGameState(playerId);
            expect(testState).toBeDefined();
            if (!testState) return;

            testState.playerState.playsLeft = 0;
            const card = dealResult.playerState?.hand?.[0] ?? "AH";

            const blockedResult = service.selectCards([card], "play", playerId);
            expect(blockedResult.code).toBe(GAME_FLOW_CODE.NO_PLAYS_LEFT);
        });

        it("should return NO_DISCARDS_LEFT when attempting discard with no discards remaining", () => {
            const playerId = "no-discards-player";
            const dealResult = initAndStart(playerId);
            const state = getGameState(playerId);
            expect(state).toBeDefined();
            if (!state) return;

            state.playerState.discardsLeft = 0;
            const card = dealResult.playerState?.hand?.[0] ?? "AH";
            const blockedResult = service.selectCards([card], "discard", playerId);
            expect(blockedResult.code).toBe(GAME_FLOW_CODE.NO_DISCARDS_LEFT);
        });

        it("should play cards successfully and decrement playsLeft only", () => {
            const playerId = "success-play-player";
            const dealResult = initAndStart(playerId);
            const selectedCards = (dealResult.playerState?.hand ?? []).slice(0, 2);

            const result = service.selectCards(selectedCards, "play", playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.action).toBe("play");
            expect(result.playerState?.playsLeft).toBe(GAME_RULE.INITIAL_PLAYS_LEFT - 1);
            expect(result.playerState?.discardsLeft).toBe(GAME_RULE.INITIAL_DISCARDS_LEFT);
            expect(result.playerState?.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            expect(result.progress?.blindOver).toBe(false);
            expect(result.progress?.gameOver).toBe(false);
            expect(result.scoreDetail?.selectedCards).toEqual(selectedCards);
            expect(result.scoreDetail?.cardType).toBeDefined();
            expect(result.scoreDetail?.baseScore).toBeDefined();
            expect(result.scoreDetail?.multiplier).toBeDefined();
            expect(result.playerState?.currentActionScore).toBeGreaterThanOrEqual(0);
        });

        it("should discard cards successfully and decrement discardsLeft only", () => {
            const playerId = "success-discard-player";
            const dealResult = initAndStart(playerId);
            const selectedCards = (dealResult.playerState?.hand ?? []).slice(0, 2);

            const result = service.selectCards(selectedCards, "discard", playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.action).toBe("discard");
            expect(result.playerState?.playsLeft).toBe(GAME_RULE.INITIAL_PLAYS_LEFT);
            expect(result.playerState?.discardsLeft).toBe(GAME_RULE.INITIAL_DISCARDS_LEFT - 1);
            expect(result.playerState?.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            expect(result.progress?.blindOver).toBe(false);
            expect(result.playerState?.currentActionScore).toBe(0);
            expect(result.scoreDetail?.baseScore).toBe(0);
            expect(result.scoreDetail?.multiplier).toBe(0);
        });

        it("should maintain hand size after each action by drawing from deck", () => {
            const playerId = "hand-size-player";
            const dealResult = initAndStart(playerId);
            const initialDeckCount = dealResult.playerState?.remainingDeckCount ?? 0;

            const currentHand = getCurrentHand(playerId);
            const result = service.selectCards(currentHand.slice(0, 3), "play", playerId);

            expect(result.playerState?.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            expect(result.playerState?.remainingDeckCount).toBe(initialDeckCount - 3);
        });

        it("should return GAME_NOT_STARTED when game is already finished", () => {
            const playerId = "finished-game-player";
            initAndStart(playerId);

            const state = getGameState(playerId);
            if (state) {
                state.gameStatus = "finished";
            }

            const result = service.selectCards(["AH"], "play", playerId);

            expect(result.code).toBe(GAME_STATE_CODE.GAME_NOT_STARTED);
        });

        it("should end blind with LOSE when plays are exhausted and target score is unreachable", () => {
            const playerId = "lose-branch-player";
            const dealResult = initAndStart(playerId);
            const state = getGameState(playerId);
            expect(state).toBeDefined();
            if (!state) return;

            state.playerState.playsLeft = 1;
            state.blindState.targetScore = 999999;
            const card = dealResult.playerState?.hand?.[0] ?? "AH";

            const result = service.selectCards([card], "play", playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.progress?.blindOver).toBe(true);
            expect(result.progress?.gameOver).toBe(true);
            expect(result.progress?.settlement?.result).toBe("LOSE");
            expect(getGameState(playerId)).toBeUndefined();
        });

        it("should end blind with WIN and provide next blind config when target score is reached", () => {
            const playerId = "win-branch-player";
            const dealResult = initAndStart(playerId);
            const state = getGameState(playerId);
            expect(state).toBeDefined();
            if (!state) return;

            state.blindState.targetScore = 1;
            const card = dealResult.playerState?.hand?.[0] ?? "AH";

            const result = service.selectCards([card], "play", playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.progress?.blindOver).toBe(true);
            expect(result.progress?.gameOver).toBe(false);
            expect(result.progress?.settlement?.result).toBe("WIN");
            expect(result.progress?.nextBlindConfig).toBeDefined();
            expect(getGameState(playerId)).toBeDefined();
        });
    });
});
