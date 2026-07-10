/**
 * GameService integration-like tests.
 *
 * These tests focus on game lifecycle, state transition, reward settlement,
 * shop phase, and WebSocket command result events.
 *
 * 当前测试更偏集成测试，不只验证单个函数返回值，
 * 也会验证 GameState 的状态推进、事件输出和阶段流转。
 */
import { GameService } from "./game.service";
import { PokerService } from "../poker/poker.service";
import {
    GAME_FLOW_CODE,
    GAME_STATE_CODE,
    PLAYER_STATE_CODE,
    REQUEST_PARAM_CODE,
    RESULT_CODE,
    GAME_RULE,
    GameSocketEvents,
    GameStatus,
} from "./constants";
import { TAG_CODE, BLIND_REWARD_RULE, INTEREST_RULE, TOTAL_ANTE_COUNT } from "./configs";

import type { GameState } from "./types";

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

    /**
     * Test helper: directly access internal in-memory GameState.
     * This is only used in service-level integration tests.
     */
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

    /**
     * Test helper: initialize a game and move it into PLAYING status.
     */
    function initAndStart(playerId: string) {
        service.initGame(playerId);
        return service.startGame(playerId);
    }

    /**
     * skipBlind intergration tests
     *
     * Covers:
     * - player state existence checks
     * - blind type / round validation
     * - skippable blind restrictions
     * - tag effects triggered by skip
     * - blindPrepared event afer skipping
     */
    describe("skipBlind", () => {
        it("should return NOT_FOUND when player does not exist", () => {
            const res = service.skipBlind("small", 1, "no-player");

            expect(res.code).toBe(PLAYER_STATE_CODE.NOT_FOUND);
        });

        it("should return INVALID_BLIND_STATE when round or blindType mismatch", () => {
            const playerId = "skip-mismatch-player";
            service.initGame(playerId);

            const res = service.skipBlind("small", 2, playerId);

            expect(res.code).toBe(REQUEST_PARAM_CODE.INVALID_BLIND_STATE);
        });

        it("should return INVALID_ACTION when blindType is not skippable", () => {
            const playerId = "skip-invalid-action";
            service.initGame(playerId);

            const state = getGameState(playerId)!;
            state.blindState.blindType = "boss" as any;

            const res = service.skipBlind("boss" as any, 1, playerId);

            expect(res.code).toBe(REQUEST_PARAM_CODE.INVALID_ACTION);
        });

        it("should reroll boss blind when current tag is BOSS_TAG", () => {
            const playerId = "skip-boss-tag";
            service.initGame(playerId);

            const state = getGameState(playerId)!;
            state.blindState.currentAnteConfig.small.tagCode = TAG_CODE.BOSS_TAG;
            state.blindState.blindType = "small";
            state.blindState.round = 1;

            const originalBoss = state.blindState.currentAnteConfig.boss.code;

            const res = service.skipBlind("small", 1, playerId);

            expect(res.code).toBe(RESULT_CODE.SUCCESS);
            expect(res.events.some((event) => event.type === GameSocketEvents.BlindSkipped)).toBe(true);
            expect(res.events.some((event) => event.type === GameSocketEvents.BlindPrepared)).toBe(true);
            expect(res.state?.blindState.round).toBe(2);
            expect(res.state?.blindState.blindType).toBe("big");

            const blindPreparedEvent = res.events.find((event) => event.type === GameSocketEvents.BlindPrepared);
            expect(blindPreparedEvent).toBeDefined();

            const payload = blindPreparedEvent!.payload as any;
            expect(payload.blindState).toBeDefined();
            expect(payload.anteConfig).toBeDefined();
            expect(payload.anteConfig.small).toBeDefined();
            expect(payload.anteConfig.big).toBeDefined();
            expect(payload.anteConfig.boss).toBeDefined();

            const newBoss = getGameState(playerId)!.blindState.currentAnteConfig.boss.code as number;
            expect(newBoss).not.toBe(originalBoss);
        });

        it("should apply JUGGLE_TAG and add a pending active tag", () => {
            const playerId = "skip-juggle-tag";
            service.initGame(playerId);

            const state = getGameState(playerId)!;
            state.blindState.currentAnteConfig.small.tagCode = TAG_CODE.JUGGLE_TAG;
            state.blindState.blindType = "small";
            state.blindState.round = 1;

            const res = service.skipBlind("small", 1, playerId);

            expect(res.code).toBe(RESULT_CODE.SUCCESS);
            expect(res.events.some((event) => event.type === GameSocketEvents.BlindSkipped)).toBe(true);
            expect(res.events.some((event) => event.type === GameSocketEvents.BlindPrepared)).toBe(true);

            const blindPreparedEvent = res.events.find((event) => event.type === GameSocketEvents.BlindPrepared);
            expect(blindPreparedEvent).toBeDefined();

            const payload = blindPreparedEvent!.payload as any;
            expect(payload.blindState.round).toBe(2);
            expect(payload.blindState.blindType).toBe("big");
            expect(payload.anteConfig).toBeDefined();

            const active = (service as unknown as { activeTags: Record<string, any[]> }).activeTags[playerId];
            expect(active).toBeDefined();
            expect(active.some((t) => t.code === TAG_CODE.JUGGLE_TAG && t.status === "pending")).toBe(true);
        });
    });

    /**
     * startGame intergrration tests
     *
     * Covers:
     * - starting without initGame
     * - inital hand dealing
     * - remaining deck count
     * - initial play / discard counts
     * - duplicate start protection
     * - restart after re-init
     */
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
            expect(state?.gameStatus).toBe(GameStatus.PLAYING);
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

        it("should return GAME_ALREADY_STARTED when startGame is called after a finished game", () => {
            const playerId = "player-restart-finished";
            service.initGame(playerId);
            service.startGame(playerId);

            const state = getGameState(playerId);
            expect(state).toBeDefined();
            if (!state) return;

            state.gameStatus = GameStatus.FINISHED;
            state.playerState.playsLeft = 0;
            state.playerState.discardsLeft = 0;
            state.playerState.currentActionScore = 999;
            state.blindState.currentBlindScore = 999;

            const restarted = service.startGame(playerId);

            expect(restarted.code).toBe(GAME_STATE_CODE.GAME_ALREADY_STARTED);
            expect(restarted.playerState).toBeDefined();
            expect(restarted.playerState?.playsLeft).toBe(0);
            expect(restarted.playerState?.discardsLeft).toBe(0);
        });

        it("should allow a finished game to restart after initGame is called again", () => {
            const playerId = "player-restart-after-init";
            service.initGame(playerId);
            service.startGame(playerId);

            const state = getGameState(playerId);
            expect(state).toBeDefined();
            if (!state) return;

            state.gameStatus = GameStatus.FINISHED;
            state.playerState.playsLeft = 0;
            state.playerState.discardsLeft = 0;
            state.playerState.currentActionScore = 999;
            state.blindState.currentBlindScore = 999;

            service.initGame(playerId);
            const restarted = service.startGame(playerId);

            expect(restarted.code).toBe(RESULT_CODE.SUCCESS);
            expect(restarted.playerState?.playsLeft).toBe(GAME_RULE.INITIAL_PLAYS_LEFT);
            expect(restarted.playerState?.discardsLeft).toBe(GAME_RULE.INITIAL_DISCARDS_LEFT);
            expect(getGameState(playerId)?.gameStatus).toBe(GameStatus.PLAYING);
        });
    });

    /**
     * selectCards integration tests
     *
     * Covers:
     * - request validation
     * - play / discard resource changes
     * - hand refill after action
     * - reward settlement
     * - shop entry after blind win
     * - final boss run comletion
     */
    describe("selectCards", () => {
        beforeAll(() => {
            console.info(
                "[GameService.spec] selectCards coverage: state checks, validation checks, play/discard success, and blind settlement branches.",
            );
        });

        it("should return NOT_FOUND when game state does not exist", () => {
            const result = service.selectCards(["AH"], "play", "non-existent-player");

            expect(result.code).toBe(PLAYER_STATE_CODE.NOT_FOUND);
            expect(result.message).toBeDefined();
            expect(result.actionResult).toBeUndefined();
            expect(result.state).toBeUndefined();
        });

        it("should return GAME_NOT_STARTED when game is initialized but not started", () => {
            const playerId = "initialized-only-player";
            service.initGame(playerId);

            const result = service.selectCards(["AH"], "play", playerId);

            expect(result.code).toBe(GAME_STATE_CODE.GAME_NOT_STARTED);
            expect(result.actionResult).toBeUndefined();
            expect(result.state?.playerState.gameStatus).toBe(GameStatus.INITIALIZED);
        });

        it("should return EMPTY_SELECTED_CARDS when no cards are selected", () => {
            const playerId = "empty-selection-player";
            initAndStart(playerId);

            const result = service.selectCards([], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.EMPTY_SELECTED_CARDS);
            expect(result.actionResult).toBeUndefined();
        });

        it("should return CARDS_LIMIT_EXCEEDED when more than 5 cards are selected", () => {
            const playerId = "limit-player";
            const dealResult = initAndStart(playerId);
            const hand = dealResult.playerState?.hand ?? [];

            const result = service.selectCards(hand.slice(0, 6), "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.CARDS_LIMIT_EXCEEDED);
            expect(result.actionResult).toBeUndefined();
        });

        it("should return INVALID_CARD_FORMAT when card format is malformed", () => {
            const playerId = "invalid-format-player";
            initAndStart(playerId);

            const result = service.selectCards(["ZZ"], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.INVALID_CARD_FORMAT);
            expect(result.actionResult).toBeUndefined();
        });

        it("should return CARD_NOT_IN_HAND when selected card is not in current hand", () => {
            const playerId = "missing-card-player";
            initAndStart(playerId);
            const missingCard = getCardNotInHand(playerId);

            const result = service.selectCards([missingCard], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.CARD_NOT_IN_HAND);
            expect(result.actionResult).toBeUndefined();
        });

        it("should return DUPLICATE_SELECTED_CARDS when same card submitted twice", () => {
            const playerId = "duplicate-card-player";
            const dealResult = initAndStart(playerId);
            const duplicateCard = dealResult.playerState?.hand?.[0] ?? "AH";

            const result = service.selectCards([duplicateCard, duplicateCard], "play", playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.DUPLICATE_SELECTED_CARDS);
            expect(result.actionResult).toBeUndefined();
        });

        it("should return INVALID_ACTION when action is not play or discard", () => {
            const playerId = "invalid-action-player";
            const dealResult = initAndStart(playerId);
            const cardInHand = dealResult.playerState?.hand?.[0] ?? "AH";

            const result = service.selectCards([cardInHand], "invalid" as any, playerId);

            expect(result.code).toBe(REQUEST_PARAM_CODE.INVALID_ACTION);
            expect(result.actionResult).toBeUndefined();
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
            expect(blockedResult.actionResult).toBeUndefined();
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
            expect(blockedResult.actionResult).toBeUndefined();
        });

        it("should play cards successfully and decrement playsLeft only", () => {
            const playerId = "success-play-player";
            const dealResult = initAndStart(playerId);
            const selectedCards = (dealResult.playerState?.hand ?? []).slice(0, 2);

            const result = service.selectCards(selectedCards, "play", playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.actionResult?.action).toBe("play");
            expect(result.actionResult?.scoreDetail).toBeDefined();
            expect(result.actionResult?.scoreDetail?.selectedCards).toEqual(selectedCards);
            expect(result.actionResult?.scoreDetail?.cardType).toBeDefined();
            expect(result.actionResult?.scoreDetail?.baseScore).toBeDefined();
            expect(result.actionResult?.scoreDetail?.multiplier).toBeDefined();
            expect(result.state?.playerState.playsLeft).toBe(GAME_RULE.INITIAL_PLAYS_LEFT - 1);
            expect(result.state?.playerState.discardsLeft).toBe(GAME_RULE.INITIAL_DISCARDS_LEFT);
            expect(result.state?.playerState.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            expect(result.state?.playerState.currentActionScore).toBeGreaterThanOrEqual(0);
            expect(result.events.some((event) => event.type === GameSocketEvents.BlindOver)).toBe(false);
        });

        it("should discard cards successfully and decrement discardsLeft only", () => {
            const playerId = "success-discard-player";
            const dealResult = initAndStart(playerId);
            const selectedCards = (dealResult.playerState?.hand ?? []).slice(0, 2);

            const result = service.selectCards(selectedCards, "discard", playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.actionResult?.action).toBe("discard");
            expect(result.actionResult?.scoreDetail?.baseScore).toBe(0);
            expect(result.actionResult?.scoreDetail?.multiplier).toBe(0);
            expect(result.state?.playerState.playsLeft).toBe(GAME_RULE.INITIAL_PLAYS_LEFT);
            expect(result.state?.playerState.discardsLeft).toBe(GAME_RULE.INITIAL_DISCARDS_LEFT - 1);
            expect(result.state?.playerState.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            expect(result.state?.playerState.currentActionScore).toBe(0);
            expect(result.events.some((event) => event.type === GameSocketEvents.BlindOver)).toBe(false);
        });

        it("should maintain hand size after each action by drawing from deck", () => {
            const playerId = "hand-size-player";
            const dealResult = initAndStart(playerId);
            const initialDeckCount = dealResult.playerState?.remainingDeckCount ?? 0;

            const currentHand = getCurrentHand(playerId);
            const result = service.selectCards(currentHand.slice(0, 3), "play", playerId);

            expect(result.state?.playerState.hand).toHaveLength(GAME_RULE.DEFAULT_HAND_SIZE);
            expect(result.state?.playerState.remainingDeckCount).toBe(initialDeckCount - 3);
        });

        it("should return GAME_NOT_STARTED when game is already finished", () => {
            const playerId = "finished-game-player";
            initAndStart(playerId);

            const state = getGameState(playerId);
            if (state) {
                state.gameStatus = GameStatus.FINISHED;
            }

            const result = service.selectCards(["AH"], "play", playerId);

            expect(result.code).toBe(GAME_STATE_CODE.GAME_NOT_STARTED);
            expect(result.actionResult).toBeUndefined();
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
            expect(result.events.some((event) => event.type === GameSocketEvents.BlindOver)).toBe(true);
            expect(result.events.some((event) => event.type === GameSocketEvents.GameOver)).toBe(true);
            expect(result.state?.gameStatus).toBe(GameStatus.FINISHED);
            expect(getGameState(playerId)).toBeUndefined();
        });

        it("should end blind with WIN and enter shopping when target score is reached", () => {
            const playerId = "win-branch-player";
            const dealResult = initAndStart(playerId);
            const state = getGameState(playerId);
            expect(state).toBeDefined();
            if (!state) return;

            state.blindState.targetScore = 1;
            const card = dealResult.playerState?.hand?.[0] ?? "AH";

            const result = service.selectCards([card], "play", playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.events.some((event) => event.type === GameSocketEvents.BlindOver)).toBe(true);
            expect(result.events.some((event) => event.type === GameSocketEvents.RewardSettled)).toBe(true);
            expect(result.events.some((event) => event.type === GameSocketEvents.ShopEntered)).toBe(true);
            expect(result.state?.gameStatus).toBe(GameStatus.SHOPPING);
            expect(result.state?.playerState.gameStatus).toBe(GameStatus.SHOPPING);
            expect(result.state?.shopState).toBeDefined();
            expect(result.state?.shopState?.items).toHaveLength(2);
            expect(getGameState(playerId)?.gameStatus).toBe(GameStatus.SHOPPING);
        });

        it("should keep completed blind in blindOver event and next blind in state", () => {
            const playerId = "blind-over-vs-state-player";
            const dealResult = initAndStart(playerId);
            const state = getGameState(playerId)!;

            state.blindState.targetScore = 1;
            state.blindState.blindType = "small";
            state.blindState.round = 1;

            const card = dealResult.playerState!.hand[0];
            const result = service.selectCards([card], "play", playerId);

            const blindOverEvent = result.events.find((event) => event.type === GameSocketEvents.BlindOver);
            expect(blindOverEvent).toBeDefined();

            const payload = blindOverEvent!.payload as any;

            expect(payload.result).toBe("win");
            expect(payload.blindState.blindType).toBe("small");
            expect(payload.blindState.round).toBe(1);

            expect(result.state?.gameStatus).toBe(GameStatus.SHOPPING);
            expect(result.state?.blindState.blindType).toBe("big");
            expect(result.state?.blindState.round).toBe(2);
        });

        it("should return reward detail and update money when blind is won", () => {
            const playerId = "win-via-flow";
            const dealResult = initAndStart(playerId);
            const state = getGameState(playerId)!;

            state.blindState.targetScore = 1;
            state.playerState.money = 23;

            const completedBlindType = state.blindState.blindType as "small" | "big" | "boss";
            const completedAnteConfig = state.blindState.currentAnteConfig;
            const expectedBaseMoney = completedAnteConfig[completedBlindType].baseRewardMoney;
            const preMoney = state.playerState.money;

            const card = dealResult.playerState!.hand[0];
            const result = service.selectCards([card], "play", playerId);

            const rewardEvent = result.events.find((event) => event.type === GameSocketEvents.RewardSettled);
            expect(rewardEvent).toBeDefined();

            const reward = rewardEvent!.payload as any;
            const remainingPlays = result.state!.playerState.playsLeft;
            const expectedRemainingBonus = remainingPlays * BLIND_REWARD_RULE.REMAINING_PLAY_BONUS_MONEY;
            const expectedInterest = Math.min(
                Math.floor(preMoney / INTEREST_RULE.MONEY_PER_INTEREST),
                INTEREST_RULE.MAX_INTEREST,
            );
            const expectedCurrent = expectedBaseMoney + expectedRemainingBonus + expectedInterest;

            expect(reward.baseMoney).toBe(expectedBaseMoney);
            expect(reward.remainingHandBonusMoney).toBe(expectedRemainingBonus);
            expect(reward.interestMoney).toBe(expectedInterest);
            expect(reward.currentBlindRewardMoney).toBe(expectedCurrent);
            expect(reward.moneyAfterReward).toBe(preMoney + expectedCurrent);
            expect(result.state?.playerState.money).toBe(reward.moneyAfterReward);
        });

        it("should not return reward or update money when blind is lost", () => {
            const playerId = "lose-via-flow";
            const dealResult = initAndStart(playerId);
            const state = getGameState(playerId)!;

            state.playerState.playsLeft = 1;
            state.blindState.targetScore = 999999;
            state.playerState.money = 50;
            const preMoney = state.playerState.money;

            const card = dealResult.playerState!.hand[0];
            const result = service.selectCards([card], "play", playerId);

            expect(result.events.some((event) => event.type === GameSocketEvents.GameOver)).toBe(true);
            expect(result.events.some((event) => event.type === GameSocketEvents.RewardSettled)).toBe(false);
            expect(result.state?.gameStatus).toBe(GameStatus.FINISHED);
            expect(result.state?.playerState.money).toBe(preMoney);
        });

        it("should cap interest money by max interest rule", () => {
            const playerId = "interest-cap-player";
            const dealResult = initAndStart(playerId);
            const state = getGameState(playerId)!;

            state.blindState.targetScore = 1;
            state.playerState.money = INTEREST_RULE.MONEY_PER_INTEREST * (INTEREST_RULE.MAX_INTEREST + 10);

            const completedBlindType = state.blindState.blindType as "small" | "big" | "boss";
            const completedAnteConfig = state.blindState.currentAnteConfig;
            const expectedBaseMoney = completedAnteConfig[completedBlindType].baseRewardMoney;
            const preMoney = state.playerState.money;

            const card = dealResult.playerState!.hand[0];
            const result = service.selectCards([card], "play", playerId);

            const rewardEvent = result.events.find((event) => event.type === GameSocketEvents.RewardSettled);
            expect(rewardEvent).toBeDefined();

            const reward = rewardEvent!.payload as any;
            const expectedRemainingBonus =
                result.state!.playerState.playsLeft * BLIND_REWARD_RULE.REMAINING_PLAY_BONUS_MONEY;

            expect(reward.interestMoney).toBe(INTEREST_RULE.MAX_INTEREST);
            expect(reward.currentBlindRewardMoney).toBe(
                expectedBaseMoney + expectedRemainingBonus + INTEREST_RULE.MAX_INTEREST,
            );
            expect(result.state?.playerState.money).toBe(preMoney + reward.currentBlindRewardMoney);
        });

        it("should end game with run_completed when final boss is won", () => {
            const playerId = "final-boss-win-player";
            const dealResult = initAndStart(playerId);
            const state = getGameState(playerId)!;

            state.blindState.ante = TOTAL_ANTE_COUNT;
            state.blindState.round = TOTAL_ANTE_COUNT * 3;
            state.blindState.blindType = "boss";
            state.blindState.targetScore = 1;
            state.blindState.currentBlindScore = 1;

            const card = dealResult.playerState!.hand[0];
            const result = service.selectCards([card], "play", playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);

            const gameOverEvent = result.events.find((event) => event.type === GameSocketEvents.GameOver);
            expect(gameOverEvent).toBeDefined();

            const payload = gameOverEvent!.payload as any;
            expect(payload.reason).toBe("run_completed");
            expect(result.state?.gameStatus).toBe(GameStatus.FINISHED);
            expect(getGameState(playerId)).toBeUndefined();
        });
    });

    /**
     * Shop phase integration tests
     *
     * Covers:
     * - buying shop items
     * - player joker ownership after purchase
     * - rerolling shop items
     * - shop action validation
     * - entering next blind preparation phase
     * - blindPrepared payload for Ante page rendering
     */
    describe("shopping and next-round integration", () => {
        /**
         * Test helper: force a successful blind win and enter SHOPPING status.
         */
        function prepareShopping(playerId: string) {
            service.initGame(playerId);
            const dealResult = service.startGame(playerId);
            const state = getGameState(playerId);
            expect(state).toBeDefined();
            if (!state) {
                throw new Error("Failed to initialize shopping state.");
            }

            state.blindState.targetScore = 1;
            const selectedCard = dealResult.playerState!.hand[0];
            const result = service.selectCards([selectedCard], "play", playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.events.some((event) => event.type === GameSocketEvents.ShopEntered)).toBe(true);
            expect(getGameState(playerId)?.gameStatus).toBe(GameStatus.SHOPPING);

            return getGameState(playerId)!;
        }

        it("should allow buying a shop item and update money and player jokers", () => {
            const playerId = "shop-buy-player";
            const state = prepareShopping(playerId);
            expect(state.shopState?.items.length).toBeGreaterThan(0);

            const item = state.shopState!.items[0];
            // Ensure player has enough money to buy the item for deterministic test.
            if (state.playerState.money < item.price) state.playerState.money = item.price;
            const moneyBefore = state.playerState.money;

            const result = service.buyShopItem(playerId, item.instanceId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.events.some((event) => event.type === GameSocketEvents.ShopItemBought)).toBe(true);
            expect(result.state?.playerState.money).toBe(moneyBefore - item.price);
            expect(result.state?.shopState?.items.find((i) => i.instanceId === item.instanceId)?.purchased).toBe(true);

            expect(result.state?.playerState.jokers).toHaveLength(1);
            expect(result.state?.playerState.jokers[0]).toMatchObject({
                instanceId: item.instanceId,
                configId: item.configId,
                name: item.name,
                description: item.description,
            });
        });

        it("should reject buyShopItem when game is not in SHOPPING state", () => {
            const playerId = "shop-buy-invalid-state";
            service.initGame(playerId);

            const result = service.buyShopItem(playerId, "invalid_id");

            expect(result.code).toBe(GAME_STATE_CODE.INVALID_GAME_STATUS_FOR_SHOP);
            expect(result.events.some((event) => event.type === GameSocketEvents.GameError)).toBe(true);
        });

        it("should reject buyShopItem when item does not exist", () => {
            const playerId = "shop-buy-missing-item";
            prepareShopping(playerId);

            const result = service.buyShopItem(playerId, "missing_item_id");

            expect(result.code).toBe(GAME_STATE_CODE.SHOP_ITEM_NOT_FOUND);
            expect(result.events.some((event) => event.type === GameSocketEvents.GameError)).toBe(true);
        });

        it("should reject buying the same shop item twice", () => {
            const playerId = "shop-buy-duplicate";
            const state = prepareShopping(playerId);

            const item = state.shopState!.items[0];
            // Ensure player has enough money for purchase
            if (state.playerState.money < item.price) state.playerState.money = item.price;

            const first = service.buyShopItem(playerId, item.instanceId);
            const second = service.buyShopItem(playerId, item.instanceId);

            expect(first.code).toBe(RESULT_CODE.SUCCESS);
            expect(second.code).toBe(GAME_STATE_CODE.SHOP_ITEM_ALREADY_PURCHASED);
            expect(second.events.some((event) => event.type === GameSocketEvents.GameError)).toBe(true);
        });

        it("should reject buyShopItem when player does not have enough money", () => {
            const playerId = "shop-buy-no-money";
            const state = prepareShopping(playerId);

            state.playerState.money = 0;
            const item = state.shopState!.items[0];

            const result = service.buyShopItem(playerId, item.instanceId);

            expect(result.code).toBe(GAME_STATE_CODE.NOT_ENOUGH_MONEY);
            expect(result.events.some((event) => event.type === GameSocketEvents.GameError)).toBe(true);
        });

        it("should allow rerolling the shop when player has enough money", () => {
            const playerId = "shop-reroll-player";
            const state = prepareShopping(playerId);

            state.playerState.money = 20;

            const beforeShopIds = state.shopState?.items.map((item) => item.instanceId) ?? [];
            const rerollCostBefore = state.shopState!.rerollCost;

            const result = service.rerollShop(playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.events.some((event) => event.type === GameSocketEvents.ShopRerolled)).toBe(true);
            expect(result.state?.playerState.money).toBe(20 - rerollCostBefore);

            const afterShopIds = result.state?.shopState?.items.map((item) => item.instanceId) ?? [];
            expect(afterShopIds).toHaveLength(beforeShopIds.length);
            expect(afterShopIds).not.toEqual(beforeShopIds);
        });

        it("should reject rerollShop when the player does not have enough money", () => {
            const playerId = "shop-reroll-no-money";
            const state = prepareShopping(playerId);

            state.playerState.money = 0;

            const result = service.rerollShop(playerId);

            expect(result.code).toBe(GAME_STATE_CODE.NOT_ENOUGH_MONEY);
            expect(result.events.some((event) => event.type === GameSocketEvents.GameError)).toBe(true);
        });

        it("should allow entering next round after shopping and prepare the next blind", () => {
            const playerId = "shop-enter-next-player";
            prepareShopping(playerId);

            const result = service.enterNextRound(playerId);

            expect(result.code).toBe(RESULT_CODE.SUCCESS);
            expect(result.events.some((event) => event.type === GameSocketEvents.BlindPrepared)).toBe(true);
            expect(result.state?.gameStatus).toBe(GameStatus.INITIALIZED);
            expect(result.state?.shopState).toBeUndefined();

            const blindPreparedEvent = result.events.find((event) => event.type === GameSocketEvents.BlindPrepared);
            expect(blindPreparedEvent).toBeDefined();

            const payload = blindPreparedEvent!.payload as any;
            expect(payload.blindState).toBeDefined();
            expect(payload.anteConfig).toBeDefined();
            expect(payload.anteConfig.small).toBeDefined();
            expect(payload.anteConfig.big).toBeDefined();
            expect(payload.anteConfig.boss).toBeDefined();
        });

        it("should reject enterNextRound when game is not in SHOPPING state", () => {
            const playerId = "shop-enter-next-invalid-state";
            service.initGame(playerId);

            const result = service.enterNextRound(playerId);

            expect(result.code).toBe(GAME_STATE_CODE.INVALID_GAME_STATUS_FOR_SHOP);
            expect(result.events.some((event) => event.type === GameSocketEvents.GameError)).toBe(true);
        });
    });
});
