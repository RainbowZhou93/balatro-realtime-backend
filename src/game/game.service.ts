import { Injectable, Logger } from "@nestjs/common";
import { Card } from "../poker/poker.types";
import { PokerService } from "../poker/poker.service";
import { CARD_PATTERN } from "../poker/poker.constants";
import { BOSS_BLIND_CONFIG, BossBlindCode, BOSS_BLIND_CODE } from "./boss.config";
import { TAG_CODE, TagCode } from "./tag.config";
import { TOTAL_ANTE_COUNT } from "./blind.config";

import { BLIND_SCORE_CONFIG } from "./blind.config";
import {
    GameState,
    PlayerState,
    BlindState,
    GameStateResponse,
    GameActionResult,
    DealResult,
    AnteConfig,
    Progress,
    NextBlindConfig,
    SkippableBlindType,
    PlayerActiveTag,
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
     * Stores the current runtime game state for each player.
     *
     * This acts as the temporary in-memory state container.
     * Future versions may migrate this to Redis or database persistence.
     */
    private readonly gameStates: Record<string, GameState> = {};

    /**
     * Stores the generated Boss Blind sequence for each player.
     *
     * Each ante consumes one Boss Blind config.
     * The sequence is generated once during initialization.
     */
    private readonly bossBlindAssignments: Record<string, BossBlindCode[]> = {};

    private readonly tagAssignments: Record<string, TagCode[]> = {};
    private readonly activeTags: Record<string, PlayerActiveTag[]> = {};

    constructor(private readonly pokerService: PokerService) {}

    /**
     * Initializes the full game lifecycle.
     *
     * This method is responsible for:
     * - creating initial game state
     * - initializing blind progression
     * - generating ante configuration
     *
     * It does not deal cards.
     * Actual gameplay starts in startGame().
     */
    public initGame(playerId: string): GameState {
        this.clearPlayerRuntimeState(playerId);
        // this.logger.log(`Initializing game for player: ${playerId}`);

        const gameState: GameState = this.createInitialGameState(playerId);
        this.gameStates[playerId] = gameState;

        return gameState;
    }

    /**
     * Starts the current Blind and deals cards to the player.
     *
     * This method assumes the game has already been initialized.
     * It only prepares the current playable round.
     */
    public startGame(playerId: string): DealResult {
        const gameState: GameState = this.gameStates[playerId];
        const playerState: PlayerState = this.gameStates[playerId]?.playerState;
        const blindState: BlindState = this.gameStates[playerId]?.blindState;

        if (!gameState || !playerState || !blindState) {
            return {
                code: GAME_STATE_CODE.GAME_NOT_FOUND,
                message: CODE_DESCRIPTION[GAME_STATE_CODE.GAME_NOT_FOUND],
            };
        }

        let handSize: number = playerState.handSize;

        // this.logger.log(
        //     `Starting game for player: ${playerId}, current activeTags: ${JSON.stringify(this.activeTags[playerId])}`,
        // );

        if (this.activeTags[playerId]?.some((tag) => tag.code === TAG_CODE.JUGGLE_TAG && tag.status === "pending")) {
            handSize += 3;
            this.activeTags[playerId].forEach((tag) => {
                if (tag.code === TAG_CODE.JUGGLE_TAG && tag.status === "pending") {
                    tag.status = "applied";
                }
            });
        }

        if (gameState.gameStatus == "playing") {
            return {
                code: GAME_STATE_CODE.GAME_ALREADY_STARTED,
                message: CODE_DESCRIPTION[GAME_STATE_CODE.GAME_ALREADY_STARTED],

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

        playerState.playsLeft = GAME_RULE.INITIAL_PLAYS_LEFT;
        playerState.discardsLeft = GAME_RULE.INITIAL_DISCARDS_LEFT;
        playerState.currentActionScore = 0;
        blindState.currentBlindScore = 0;

        playerState.deck = this.pokerService.shuffleDeck(this.pokerService.getBaseDeck());

        const hand = this.pokerService.serializeCards(playerState.deck.splice(0, handSize));
        hand.sort((a, b) => {
            return this.pokerService.getCardRank(b) - this.pokerService.getCardRank(a);
        });
        playerState.hand = hand;
        gameState.gameStatus = "playing";

        const dealResult = {
            code: RESULT_CODE.SUCCESS,
            message: CODE_DESCRIPTION[RESULT_CODE.SUCCESS],
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

        // this.logger.log(`-${playerId}- startGame playerState: ${JSON.stringify(gameState)}`);
        return dealResult;
    }

    /**
     * Handles the player's card selection action, either "play" or "discard".
     *
     * This method performs:
     * - input validation
     * - score calculation for "play" action
     * - hand update (remove selected cards, draw new cards)
     * - blind progression check
     * - response construction with updated game state and progression info
     */
    public selectCards(selectedCards: string[], action: "play" | "discard", playerId: string): GameActionResult {
        const gameState: GameState = this.gameStates[playerId];
        const playerState: PlayerState = gameState?.playerState;
        const blindState: BlindState = gameState?.blindState;
        let cardType: number = 0;
        let baseScore: number = 0;
        let multiplier: number = 0;
        let validCards: string[] = [];

        // this.logger.log(`Player ${playerId} selected cards: ${JSON.stringify(selectedCards)}, action: ${action}`);
        // this.logger.log(`Current gameState before action: ${JSON.stringify(gameState)}`);

        if (!playerId || !gameState) {
            return this.buildActionResult({ code: PLAYER_STATE_CODE.NOT_FOUND, action: action });
        }

        if (gameState.gameStatus !== "playing") {
            return this.buildActionResult({ code: GAME_STATE_CODE.GAME_NOT_STARTED, action: action });
        }

        const handCards: string[] = playerState.hand;

        if (!selectedCards?.length) {
            return this.buildActionResult({ code: REQUEST_PARAM_CODE.EMPTY_SELECTED_CARDS, action: action });
        }

        if (selectedCards?.length > GAME_RULE.MAX_SELECT_CARDS) {
            return this.buildActionResult({ code: REQUEST_PARAM_CODE.CARDS_LIMIT_EXCEEDED, action: action });
        }

        const validCard = selectedCards.every((card) => CARD_PATTERN.test(card));
        if (!validCard) {
            return this.buildActionResult({ code: REQUEST_PARAM_CODE.INVALID_CARD_FORMAT, action: action });
        }

        const selectedSet = new Set(selectedCards);
        if (selectedSet.size !== selectedCards.length) {
            return this.buildActionResult({ code: REQUEST_PARAM_CODE.DUPLICATE_SELECTED_CARDS, action: action });
        }

        const existCards = selectedCards.every((item) => handCards.includes(item));
        if (!existCards) {
            this.logger.warn(
                `Player ${playerId} selected cards not in hand. selectedCards: ${JSON.stringify(selectedCards)}, handCards: ${JSON.stringify(handCards)}`,
            );
            return this.buildActionResult({ code: REQUEST_PARAM_CODE.CARD_NOT_IN_HAND, action: action });
        }

        if (action !== SELECT_CARD_ACTION.PLAY && action !== SELECT_CARD_ACTION.DISCARD) {
            return this.buildActionResult({ code: REQUEST_PARAM_CODE.INVALID_ACTION, action: action });
        }

        if (action == SELECT_CARD_ACTION.PLAY && playerState.playsLeft <= 0) {
            return this.buildActionResult({ code: GAME_FLOW_CODE.NO_PLAYS_LEFT, action: action });
        }

        if (action == SELECT_CARD_ACTION.DISCARD && playerState.discardsLeft <= 0) {
            return this.buildActionResult({ code: GAME_FLOW_CODE.NO_DISCARDS_LEFT, action: action });
        }

        if (action == SELECT_CARD_ACTION.PLAY) {
            let bossCode: number = -1;
            if (blindState.blindType == "boss") bossCode = blindState.currentAnteConfig.boss.code;
            const result = this.pokerService.calculateHandScore(selectedCards, bossCode);
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

        const selectCardsResult = this.buildActionResult({
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

    /**
     * Handles the skip-blind action.
     * Claims the current blind's tag reward and advances the game to the next blind.
     */
    public skipBlind(blindType: SkippableBlindType, round: number, playerId: string): GameActionResult {
        const gameState: GameState = this.gameStates[playerId];
        const action = "skipBlind";

        if (!gameState) {
            return this.buildActionResult({ code: PLAYER_STATE_CODE.NOT_FOUND, action });
        }
        const blindState: BlindState = gameState.blindState;
        if (blindState.round != round || blindState.blindType != blindType) {
            return this.buildActionResult({ code: REQUEST_PARAM_CODE.INVALID_BLIND_STATE, action });
        }

        if (blindType !== "small" && blindType !== "big") {
            return this.buildActionResult({ code: REQUEST_PARAM_CODE.INVALID_ACTION, action });
        }

        if (!this.activeTags[playerId]) this.activeTags[playerId] = [];

        const tagCode: TagCode = blindState.currentAnteConfig[blindType].tagCode;

        // Rerolls the next Boss Blind
        if (tagCode === TAG_CODE.BOSS_TAG) {
            const currentBossCode = blindState.currentAnteConfig.boss.code;

            const bossBlindCodeList: BossBlindCode[] = Object.values(BOSS_BLIND_CODE).filter(
                (code) => code !== currentBossCode,
            );

            const newBossBlindCode = bossBlindCodeList[Math.floor(Math.random() * bossBlindCodeList.length)];

            blindState.currentAnteConfig.boss.code = newBossBlindCode;
            blindState.currentAnteConfig.boss.name = BOSS_BLIND_CONFIG[newBossBlindCode].name;

            // this.logger.log(
            //     `Player ${playerId} used ${tagConfig.name} to reroll Boss Blind. New Boss Blind: ${blindState.currentAnteConfig.boss.name}`,
            // );
        } else if (tagCode == TAG_CODE.JUGGLE_TAG) {
            this.activeTags[playerId].push({
                code: TAG_CODE.JUGGLE_TAG,
                status: "pending",
            });
        }

        const nextProgress = this.getNextBlindProgress(gameState);

        const progress: Progress = {
            gameOver: false,
            blindOver: true,
            currentAnteConfig: blindState.currentAnteConfig,
            nextBlindConfig: nextProgress.nextBlindConfig,
        };

        this.advanceToNextBlind(gameState, nextProgress);

        return {
            code: RESULT_CODE.SUCCESS,
            message: CODE_DESCRIPTION[RESULT_CODE.SUCCESS],
            action: "skipBlind",
            progress,
            blindState,
        };
    }

    /**
     * Builds the unified selectCards response structure.
     *
     * The response is grouped by responsibility:
     * - action result
     * - player state
     * - blind state
     * - progression state
     *
     * This prevents the response structure from becoming a large flat object as gameplay systems expand.
     */
    private buildActionResult(param: {
        code: number;
        action: "play" | "discard" | "skipBlind";
        selectedCards?: string[];
        gameState?: GameState;
        cardType?: number;
        validCards?: string[];
        baseScore?: number;
        multiplier?: number;
    }): GameActionResult {
        const { code, action, selectedCards, gameState, cardType, validCards, baseScore, multiplier } = param;
        // this.logger.log(`buildActionResult : ${JSON.stringify(param)}`);

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

        const scoreDetail = {
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
            this.resolveProgressAfterBlind(gameState, blindStates, progress);
        }

        return {
            code,
            message: CODE_DESCRIPTION[code],
            action: action,
            playerState,
            blindState,
            progress,
            scoreDetail,
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
        const handSize: number = handCards.length;

        const getSize: number = handSize - newHand.length;
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

    /**
     * Builds the next Blind preview information.
     *
     * This method only prepares frontend display data.
     * It does not update the actual gameState.
     *
     * Real Blind progression is handled separately by advanceToNextBlind().
     */
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

    /**
     * Builds the complete ante configuration for frontend display.
     *
     * Includes:
     * - small blind
     * - big blind
     * - boss blind
     *
     * Boss Blind assignments are consumed per ante.
     */
    private getAnteConfig(playerId: string, ante: number): AnteConfig {
        let bossBlindAssignmentsByPlayer = this.bossBlindAssignments[playerId];
        if (!bossBlindAssignmentsByPlayer) {
            const bossBlindCodeList: BossBlindCode[] = Object.values(BOSS_BLIND_CODE);
            bossBlindAssignmentsByPlayer = this.shuffleConfig(bossBlindCodeList);

            this.bossBlindAssignments[playerId] = bossBlindAssignmentsByPlayer;
        }
        // this.logger.log(`Player ${playerId}, bossBlindAssignments: ${JSON.stringify(this.bossBlindAssignments[playerId])}`);

        let tagAssignmentsByPlayer = this.tagAssignments[playerId];
        if (!tagAssignmentsByPlayer) {
            const baseTagCodeList: TagCode[] = Object.values(TAG_CODE);
            const allTagCodes: TagCode[] = [];

            // Temporary workaround
            // only 2 tags are defined for now, so expand them to cover all skippable blinds first.
            // This is a transitional assignment strategy for current stage.
            const totalSkipBlindCount = TOTAL_ANTE_COUNT * 2;
            for (let i = 0; i < totalSkipBlindCount; i++) {
                allTagCodes.push(baseTagCodeList[i % baseTagCodeList.length]);
            }

            tagAssignmentsByPlayer = this.shuffleConfig(allTagCodes);
            this.tagAssignments[playerId] = tagAssignmentsByPlayer;
        }
        // this.logger.log(`Player ${playerId}, tagAssignments: ${JSON.stringify(this.tagAssignments[playerId])}`);

        const code = bossBlindAssignmentsByPlayer.shift();
        if (!code) {
            throw new Error(`No more boss blind code available for player: ${playerId}`);
        }

        const smallTag = tagAssignmentsByPlayer.shift();
        const bigTag = tagAssignmentsByPlayer.shift();

        if (!smallTag || !bigTag) {
            throw new Error(`No more tag code available for player: ${playerId}`);
        }

        const currentAnteConfig = {
            ante: ante,
            small: {
                score: BLIND_SCORE_CONFIG[ante][0].score,
                tagCode: smallTag,
            },
            big: {
                score: BLIND_SCORE_CONFIG[ante][1].score,
                tagCode: bigTag,
            },
            boss: {
                score: BLIND_SCORE_CONFIG[ante][2].score,
                code: code,
                name: BOSS_BLIND_CONFIG[code].name,
            },
        };
        return currentAnteConfig;
    }

    /**
     * Advances the runtime game state to the next Blind.
     *
     * This updates:
     * - round
     * - ante
     * - blind type
     * - target score
     * - current ante config
     *
     * After progression, the game returns to the "initialized" state and waits for startGame().
     */
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

    private shuffleConfig<T>(arr: T[]): T[] {
        const out = [...arr];
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    }

    /**
     * Removes one-round tags that have already been applied and should no longer remain active.
     */
    private cleanupExpiredTags(playerId: string): void {
        this.activeTags[playerId] = (this.activeTags[playerId] ?? []).filter(
            (tag) => !(tag.code === TAG_CODE.JUGGLE_TAG && tag.status === "applied"),
        );
    }

    /**
     * Resolves the game progress after a blind ends.
     * Updates settlement info, advances to the next blind if needed, or clears runtime state on game over.
     */
    private resolveProgressAfterBlind(gameState: GameState, blindStates: BlindState, progress: Progress): void {
        const result = blindStates.currentBlindScore >= blindStates.targetScore ? "WIN" : "LOSE";

        progress.settlement = {
            finalScore: blindStates.currentBlindScore,
            targetScore: blindStates.targetScore,
            result: result,
        };

        if (result === "LOSE") {
            progress.gameOver = true;

            this.clearPlayerRuntimeState(gameState.playerId);

            // this.logger.log(
            //     `Player ${gameState.playerId} lost the blind. Game over. Final score: ${blindStates.currentBlindScore}, Target score: ${blindStates.targetScore}`,
            // );
        } else {
            const nextProgress = this.getNextBlindProgress(gameState);

            progress.nextBlindConfig = nextProgress.nextBlindConfig;

            if (nextProgress.nextAnteConfig) {
                progress.nextAnteConfig = nextProgress.nextAnteConfig;
            }

            this.advanceToNextBlind(gameState, nextProgress);
            this.cleanupExpiredTags(gameState.playerId);
        }
    }

    /**
     * Clears all runtime state associated with the current player.
     * Used when the game ends or when the player starts a new game.
     */
    private clearPlayerRuntimeState(playerId: string): void {
        delete this.gameStates[playerId];
        delete this.activeTags[playerId];
        delete this.bossBlindAssignments[playerId];
        delete this.tagAssignments[playerId];
    }
}
