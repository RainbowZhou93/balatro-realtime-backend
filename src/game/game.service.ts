import { Injectable, Logger } from "@nestjs/common";
import { Card } from "../poker/poker.types";
import { PokerService } from "../poker/poker.service";
import { CARD_PATTERN } from "../poker/poker.constants";
import { BOSS_BLIND_CONFIG, BossBlindCode, BOSS_BLIND_CODE } from "./boss.config";
import { TAG_CODE, TagCode } from "./tag.config";
import { TOTAL_ANTE_COUNT, BLIND_SCORE_CONFIG } from "./blind.config";
import { SHOP_ITEM_CONFIG, SHOP_RULE } from "./shop.config";
import { ShopItem, ShopState, ShopStateResponse } from "./types";

import { ECONOMY_RULE, BLIND_REWARD_RULE, INTEREST_RULE } from "./economy.config";
import {
    GameState,
    PlayerState,
    BlindState,
    GameCommandResult,
    DealResult,
    AnteConfig,
    NextBlindConfig,
    SkippableBlindType,
    PlayerActiveTag,
    RewardMoneyDetail,
    ActionType,
    GameActionResult,
    GameEvent,
    GameStateResponse,
    ShopItemResponse,
    BlindStateResponse,
    BlindPreparedPayload,
} from "./types";

import {
    RESULT_CODE,
    PLAYER_STATE_CODE,
    REQUEST_PARAM_CODE,
    GAME_FLOW_CODE,
    SELECT_CARD_ACTION,
    GAME_RULE,
    GAME_STATE_CODE,
    CODE_DESCRIPTION,
    GameStatus,
    GameSocketEvents,
} from "./constants";

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

    private shopItemInstanceIdCounter = 1;

    constructor(private readonly pokerService: PokerService) { }

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

        if (gameState.gameStatus !== GameStatus.INITIALIZED) {
            return {
                code: GAME_STATE_CODE.GAME_ALREADY_STARTED,
                message: CODE_DESCRIPTION[GAME_STATE_CODE.GAME_ALREADY_STARTED],

                playerState: {
                    hand: playerState.hand,
                    remainingDeckCount: playerState.deck.length,
                    playsLeft: playerState.playsLeft,
                    discardsLeft: playerState.discardsLeft,
                    money: playerState.money,
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
        gameState.gameStatus = GameStatus.PLAYING;

        const dealResult = {
            code: RESULT_CODE.SUCCESS,
            message: CODE_DESCRIPTION[RESULT_CODE.SUCCESS],
            playerState: {
                hand: playerState.hand,
                remainingDeckCount: playerState.deck.length,
                playsLeft: playerState.playsLeft,
                discardsLeft: playerState.discardsLeft,
                money: playerState.money,
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
     * - request validation
     * - score calculation for "play"
     * - hand update and card drawing
     * - blind-over detection
     * - command result construction with domain events and final state snapshot
     *
     * Note:
     * - game:blindOver describes the completed Blind.
     * - game: stateChanged describes the latest state afer all mutations.
     */
    public selectCards(selectedCards: string[], action: "play" | "discard", playerId: string): GameCommandResult {
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
            return this.buildCommandErrorResult({ code: PLAYER_STATE_CODE.NOT_FOUND });
        }

        if (gameState.gameStatus !== GameStatus.PLAYING) {
            return this.buildCommandErrorResult({ code: GAME_STATE_CODE.GAME_NOT_STARTED, gameState });
        }

        const handCards: string[] = playerState.hand;

        if (!selectedCards?.length) {
            return this.buildCommandErrorResult({ code: REQUEST_PARAM_CODE.EMPTY_SELECTED_CARDS, gameState });
        }

        if (selectedCards?.length > GAME_RULE.MAX_SELECT_CARDS) {
            return this.buildCommandErrorResult({ code: REQUEST_PARAM_CODE.CARDS_LIMIT_EXCEEDED, gameState });
        }

        const validCard = selectedCards.every((card) => CARD_PATTERN.test(card));
        if (!validCard) {
            return this.buildCommandErrorResult({ code: REQUEST_PARAM_CODE.INVALID_CARD_FORMAT, gameState });
        }

        const selectedSet = new Set(selectedCards);
        if (selectedSet.size !== selectedCards.length) {
            return this.buildCommandErrorResult({ code: REQUEST_PARAM_CODE.DUPLICATE_SELECTED_CARDS, gameState });
        }

        const existCards = selectedCards.every((item) => handCards.includes(item));
        if (!existCards) {
            this.logger.warn(
                `Player ${playerId} selected cards not in hand. selectedCards: ${JSON.stringify(selectedCards)}, handCards: ${JSON.stringify(handCards)}`,
            );
            return this.buildCommandErrorResult({ code: REQUEST_PARAM_CODE.CARD_NOT_IN_HAND, gameState });
        }

        if (action !== SELECT_CARD_ACTION.PLAY && action !== SELECT_CARD_ACTION.DISCARD) {
            return this.buildCommandErrorResult({ code: REQUEST_PARAM_CODE.INVALID_ACTION, gameState });
        }

        if (action == SELECT_CARD_ACTION.PLAY && playerState.playsLeft <= 0) {
            return this.buildCommandErrorResult({ code: GAME_FLOW_CODE.NO_PLAYS_LEFT, gameState });
        }

        if (action == SELECT_CARD_ACTION.DISCARD && playerState.discardsLeft <= 0) {
            return this.buildCommandErrorResult({ code: GAME_FLOW_CODE.NO_DISCARDS_LEFT, gameState });
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

        const selectCardsResult: GameCommandResult = this.buildActionResult({
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
    public skipBlind(blindType: SkippableBlindType, round: number, playerId: string): GameCommandResult {
        const gameState: GameState = this.gameStates[playerId];

        if (!gameState) {
            return this.buildCommandErrorResult({ code: PLAYER_STATE_CODE.NOT_FOUND });
        }

        if (gameState.gameStatus !== GameStatus.INITIALIZED) {
            return this.buildCommandErrorResult({ code: GAME_STATE_CODE.INVALID_GAME_STATUS_FOR_SKIP, gameState });
        }

        const blindState: BlindState = gameState.blindState;
        if (blindState.round != round || blindState.blindType != blindType) {
            return this.buildCommandErrorResult({ code: REQUEST_PARAM_CODE.INVALID_BLIND_STATE, gameState });
        }

        const playerStates: PlayerState = gameState.playerState;
        if (!playerStates) {
            return this.buildCommandErrorResult({ code: PLAYER_STATE_CODE.NOT_FOUND, gameState });
        }

        if (blindType !== "small" && blindType !== "big") {
            return this.buildCommandErrorResult({ code: REQUEST_PARAM_CODE.INVALID_ACTION, gameState });
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

        const nextProgress = this.getNextBlindTransition(gameState);

        this.advanceToNextBlind(gameState, nextProgress);
        gameState.gameStatus = GameStatus.INITIALIZED;
        console.log(`gameState.gameStatus: ${gameState.gameStatus}`);
        return {
            code: RESULT_CODE.SUCCESS,
            message: CODE_DESCRIPTION[RESULT_CODE.SUCCESS],
            events: [
                {
                    type: GameSocketEvents.BlindSkipped,
                    payload: {
                        blindType,
                        tagCode,
                    },
                },
                {
                    type: GameSocketEvents.BlindPrepared,
                    payload: this.buildBlindPreparedPayload(gameState),
                },
            ],
            state: this.buildGameStateResponse(gameState),
        };
    }

    /**
     * Buys one item from the current shop.
     *
     * Current stage only supports virtual Joker items.
     * Buying a Joker only records ownership in playerState.jokers.
     * Joker scoring effects are intentionally not handled here.
     */
    public buyShopItem(playerId: string, instanceId: string): GameCommandResult {
        const gameState = this.gameStates[playerId];

        if (!gameState) {
            return this.buildCommandErrorResult({ code: PLAYER_STATE_CODE.NOT_FOUND });
        }

        if (gameState.gameStatus !== GameStatus.SHOPPING) {
            return this.buildCommandErrorResult({ code: GAME_STATE_CODE.INVALID_GAME_STATUS_FOR_SHOP, gameState });
        }

        if (!gameState.shopState) {
            return this.buildCommandErrorResult({ code: GAME_STATE_CODE.SHOP_STATE_NOT_FOUND, gameState });
        }

        if (!instanceId) {
            return this.buildCommandErrorResult({ code: REQUEST_PARAM_CODE.PARAM_ERROR, gameState });
        }

        const shopItem = gameState.shopState.items.find((item) => item.instanceId === instanceId);

        if (!shopItem) {
            return this.buildCommandErrorResult({ code: GAME_STATE_CODE.SHOP_ITEM_NOT_FOUND, gameState });
        }

        if (shopItem.purchased) {
            return this.buildCommandErrorResult({ code: GAME_STATE_CODE.SHOP_ITEM_ALREADY_PURCHASED, gameState });
        }

        if (gameState.playerState.money < shopItem.price) {
            return this.buildCommandErrorResult({ code: GAME_STATE_CODE.NOT_ENOUGH_MONEY, gameState });
        }

        gameState.playerState.money -= shopItem.price;
        shopItem.purchased = true;

        // Current stage only records owned Jokers.
        // Runtime effect state will be added when Joker effects are implemented.
        gameState.playerState.jokers.push({
            instanceId: shopItem.instanceId,
            configId: shopItem.configId,
            name: shopItem.name,
            description: shopItem.description,
            runtimeState: {},
        });

        const boughtItemResponse = this.buildShopItemResponse(shopItem);

        return {
            code: RESULT_CODE.SUCCESS,
            message: CODE_DESCRIPTION[RESULT_CODE.SUCCESS],
            events: [
                {
                    type: GameSocketEvents.ShopItemBought,
                    payload: {
                        item: boughtItemResponse,
                        moneyAfterPurchase: gameState.playerState.money,
                    },
                },
            ],
            state: this.buildGameStateResponse(gameState),
        };
    }

    /**
     * Leaves the shop phase and prepares the next Blind.
     *
     * This method does not deal cards and does not enter PLAYING.
     * The client should call startGame() after receiving game:blindPrepared.
     */
    public enterNextRound(playerId: string): GameCommandResult {
        const gameState: GameState = this.gameStates[playerId];

        if (!gameState) {
            return this.buildCommandErrorResult({ code: PLAYER_STATE_CODE.NOT_FOUND });
        }

        if (gameState.gameStatus !== GameStatus.SHOPPING) {
            return this.buildCommandErrorResult({ code: GAME_STATE_CODE.INVALID_GAME_STATUS_FOR_SHOP, gameState });
        }

        gameState.shopState = undefined;
        gameState.gameStatus = GameStatus.INITIALIZED;

        return {
            code: RESULT_CODE.SUCCESS,
            message: CODE_DESCRIPTION[RESULT_CODE.SUCCESS],
            events: [
                {
                    type: GameSocketEvents.BlindPrepared,
                    payload: this.buildBlindPreparedPayload(gameState),
                },
            ],
            state: this.buildGameStateResponse(gameState),
        };
    }

    /**
     * Rerolls current shop items.
     *
     * This method:
     * - validates SHOPPING status
     * - charges reroll cost
     * - replaces current shopState with newly generated items
     *
     * It does not affect owned Jokers.
     */
    public rerollShop(playerId: string): GameCommandResult {
        const gameState = this.gameStates[playerId];

        if (!gameState) {
            return this.buildCommandErrorResult({ code: PLAYER_STATE_CODE.NOT_FOUND });
        }

        if (gameState.gameStatus !== GameStatus.SHOPPING) {
            return this.buildCommandErrorResult({ code: GAME_STATE_CODE.INVALID_GAME_STATUS_FOR_SHOP, gameState });
        }

        if (!gameState.shopState) {
            return this.buildCommandErrorResult({ code: GAME_STATE_CODE.SHOP_STATE_NOT_FOUND, gameState });
        }

        const rerollCost = gameState.shopState.rerollCost;

        if (gameState.playerState.money < rerollCost) {
            return this.buildCommandErrorResult({ code: GAME_STATE_CODE.NOT_ENOUGH_MONEY, gameState });
        }

        gameState.playerState.money -= rerollCost;

        gameState.shopState = this.createShopState();

        const shopStateResponse = this.buildShopStateResponse(gameState);

        return {
            code: RESULT_CODE.SUCCESS,
            message: CODE_DESCRIPTION[RESULT_CODE.SUCCESS],
            events: [
                {
                    type: GameSocketEvents.ShopRerolled,
                    payload: {
                        cost: rerollCost,
                        shopState: shopStateResponse,
                        moneyAfterReroll: gameState.playerState.money,
                    },
                },
            ],
            state: this.buildGameStateResponse(gameState),
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
        action: ActionType;
        selectedCards?: string[];
        gameState?: GameState;
        cardType?: number;
        validCards?: string[];
        baseScore?: number;
        multiplier?: number;
    }): GameCommandResult {
        const { code, action, selectedCards, gameState, cardType, validCards, baseScore, multiplier } = param;
        // this.logger.log(`buildActionResult : ${JSON.stringify(param)}`);

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
                actionResult: { action },
                events: [],
            };
        }

        const playerStates: PlayerState = gameState.playerState;
        const blindStates: BlindState = gameState.blindState;

        const blindOver = this.isBlindOver(playerStates, gameState);

        const playAction: GameActionResult = {
            action,
            scoreDetail: {
                selectedCards,
                cardType,
                validCards,
                baseScore,
                multiplier,
            },
        };

        const events: GameEvent[] = [];
        if (blindOver) {
            events.push(...this.resolveBlindOver(gameState, blindStates));
        }

        const state: GameStateResponse = this.buildGameStateResponse(gameState);

        const gameCommand: GameCommandResult = {
            code,
            message: CODE_DESCRIPTION[code],
            actionResult: playAction,
            events,
            state,
        };
        return gameCommand;
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
                money: ECONOMY_RULE.INITIAL_MONEY,
                jokers: [],
            },
            blindState: {
                round: 1,
                ante: 1,
                blindType: "small",
                targetScore: currentAnteConfig.small.score,
                currentAnteConfig: currentAnteConfig,
                currentBlindScore: 0,
            },
            gameStatus: GameStatus.INITIALIZED,
        };

        return this.gameStates[playerId];
    }

    /**
     * Builds the next Blind preview information.
     *
     * This method only calculates where the game should move next.
     * It does not mutate gameState.
     *
     * For boss Blind completion, it may also prepare nextAnteConfig.
     * The actual state mutation is handled by advanceToNextBlind().
     */
    private getNextBlindTransition(gameState: GameState): {
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

        if (nextAnte > TOTAL_ANTE_COUNT) {
            return {
                nextBlindConfig: {
                    ante: nextAnte,
                    blindType: "small",
                    score: 0,
                },
            };
        }
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

    /**
     * A Blind is over when the target score is reached or no plays remain.
     */
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

        const blindConfig = BLIND_SCORE_CONFIG[ante];
        const currentAnteConfig = {
            ante: ante,
            small: {
                score: blindConfig[0].score,
                tagCode: smallTag,
                baseRewardMoney: blindConfig[0].baseRewardMoney,
            },
            big: {
                score: blindConfig[1].score,
                tagCode: bigTag,
                baseRewardMoney: blindConfig[1].baseRewardMoney,
            },
            boss: {
                score: blindConfig[2].score,
                code: code,
                name: BOSS_BLIND_CONFIG[code].name,
                baseRewardMoney: blindConfig[2].baseRewardMoney,
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
     * It does not change gameStatus.
     * The caller decides whether the next phase is SHOPPING or INITIALIZED.
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

    private applyRewardMoney(gameState: GameState, rewardMoney: number): void {
        gameState.playerState.money += rewardMoney;
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
     * Resolves all side effects after a Blind is over.
     *
     * Responsibilities:
     * - emit game:blindOver for the completed Blind
     * - finish the run when the player loses
     * - finish the run when the final Boss is cleared
     * - settle reward money on win
     * - advance internal Blind state
     * - enter SHOPPING phase and create shopState
     *
     * Important:
     * game:blindOver uses the completed Blind state.
     * game:stateChanged is built later and represents the final state after this method mutates gameState.
     */
    private resolveBlindOver(gameState: GameState, blindStates: BlindState): GameEvent[] {
        const events: GameEvent[] = [];
        const result = blindStates.currentBlindScore >= blindStates.targetScore ? "win" : "lose";

        const completedBlindState = this.buildBlindStateResponse(gameState);
        events.push({
            type: GameSocketEvents.BlindOver,
            payload: {
                result,
                blindState: completedBlindState,
            },
        });

        if (result === "lose") {
            gameState.gameStatus = GameStatus.FINISHED;

            events.push({
                type: GameSocketEvents.GameOver,
                payload: {
                    reason: "blind_failed",
                },
            });

            this.clearPlayerRuntimeState(gameState.playerId);
            return events;

            // this.logger.log(
            //     `Player ${gameState.playerId} lost the blind. Game over. Final score: ${blindStates.currentBlindScore}, Target score: ${blindStates.targetScore}`,
            // );
        } else {
            const nextProgress = this.getNextBlindTransition(gameState);

            if (nextProgress.nextBlindConfig.ante > TOTAL_ANTE_COUNT) {
                gameState.gameStatus = GameStatus.FINISHED;

                events.push({
                    type: GameSocketEvents.GameOver,
                    payload: {
                        reason: "run_completed",
                    },
                });
                this.clearPlayerRuntimeState(gameState.playerId);
                return events;
            }

            const awardMoney: RewardMoneyDetail = this.calculateBlindRewardDetail(blindStates, gameState.playerState);

            this.applyRewardMoney(gameState, awardMoney.currentBlindRewardMoney);
            this.advanceToNextBlind(gameState, nextProgress);

            gameState.gameStatus = GameStatus.SHOPPING;
            gameState.shopState = this.createShopState();

            this.cleanupExpiredTags(gameState.playerId);

            events.push({
                type: GameSocketEvents.RewardSettled,
                payload: awardMoney,
            });

            events.push({
                type: GameSocketEvents.ShopEntered,
                payload: this.buildShopStateResponse(gameState),
            });

            return events;
        }
    }

    /**
     * Calculates the money reward detail for current completed Blind.
     * The reward composed of:
     * - base money from the current Blind configuration
     * - bouns money from remaining plays
     * - interest money based on the player's current money before this reward is applied
     * This method only calculates the reward detail and does not mutate game state.
     */
    private calculateBlindRewardDetail(blindState: BlindState, playerState: PlayerState): RewardMoneyDetail {
        const blindType = blindState.blindType;
        const playsLeft = playerState.playsLeft;
        const baseMoney = blindState.currentAnteConfig[blindType].baseRewardMoney;

        const remainingHandBonusMoney = playsLeft * BLIND_REWARD_RULE.REMAINING_PLAY_BONUS_MONEY;
        const blindRewardMoney = baseMoney + remainingHandBonusMoney;

        const interestMoney = Math.min(
            Math.floor(playerState.money / INTEREST_RULE.MONEY_PER_INTEREST),
            INTEREST_RULE.MAX_INTEREST,
        );

        const currentBlindRewardMoney = blindRewardMoney + interestMoney;

        return {
            baseMoney,
            remainingHandBonusMoney: remainingHandBonusMoney,
            interestMoney: interestMoney,
            currentBlindRewardMoney: currentBlindRewardMoney,
            moneyAfterReward: playerState.money + currentBlindRewardMoney,
        };
    }

    /**
     * Builds the latest state snapshot exposed to the client.
     *
     * This response is a snapshot, not a progress description.
     * Process details such as reward settlement, blind completion,
     * and blind preparation are emitted as separate domain events.
     */
    private buildGameStateResponse(gameState: GameState): GameStateResponse {
        const playerState = gameState.playerState;
        const blindState = gameState.blindState;

        return {
            playerState: {
                hand: playerState.hand,
                playsLeft: playerState.playsLeft,
                discardsLeft: playerState.discardsLeft,
                remainingDeckCount: playerState.deck.length,
                money: playerState.money,
                currentBlindScore: blindState.currentBlindScore,
                currentActionScore: playerState.currentActionScore,
                gameStatus: gameState.gameStatus,
                targetScore: blindState.targetScore,

                // Current stage return players jokers directly.
                // Joker response DTO and runtime effect stage will be refined when Joker effects are implemented.
                jokers: playerState.jokers,
            },
            blindState: {
                round: blindState.round,
                ante: blindState.ante,
                blindType: blindState.blindType,
                targetScore: blindState.targetScore,
                currentBlindScore: blindState.currentBlindScore,
            },

            shopState:
                gameState.gameStatus === GameStatus.SHOPPING ? this.buildShopStateResponse(gameState) : undefined,

            gameStatus: gameState.gameStatus,
        };
    }

    /**
     * Creates a new shop state from static shop item configs.
     *
     * Each shop item gets a runtime instanceId so the client can buy
     * a concrete item from the current shop, not just a static config.
     */
    private createShopState(): ShopState {
        const shuffledConfigs = this.shuffleConfig([...SHOP_ITEM_CONFIG]);
        const selectedConfigs = shuffledConfigs.slice(0, SHOP_RULE.SHOP_ITEM_COUNT);

        const items: ShopItem[] = selectedConfigs.map((config) => {
            return {
                instanceId: this.createShopItemInstanceId(),
                configId: config.configId,
                name: config.name,
                type: config.type,
                price: config.basePrice,
                description: config.description,
                effectType: config.effectType,
                purchased: false,
            };
        });

        return {
            items,
            rerollCost: SHOP_RULE.DEFAULT_REROLL_COST,
        };
    }

    private buildShopStateResponse(gameState: GameState): ShopStateResponse {
        const shopState = gameState.shopState;

        if (!shopState) {
            return {
                items: [],
                rerollCost: SHOP_RULE.DEFAULT_REROLL_COST,
            };
        }

        return {
            items: shopState.items.map((item) => this.buildShopItemResponse(item)),
            rerollCost: shopState.rerollCost,
        };
    }

    private buildShopItemResponse(item: ShopItem): ShopItemResponse {
        return {
            instanceId: item.instanceId,
            configId: item.configId,
            name: item.name,
            type: item.type,
            price: item.price,
            description: item.description,
            purchased: item.purchased,
        };
    }

    private buildBlindStateResponse(gameState: GameState): BlindStateResponse {
        const blindState = gameState.blindState;

        return {
            round: blindState.round,
            ante: blindState.ante,
            blindType: blindState.blindType,
            targetScore: blindState.targetScore,
            currentBlindScore: blindState.currentBlindScore,
        };
    }

    /**
     * Builds the payload used by game:blindPrepared.
     *
     * This event is used by the client to render the Ante / Blind preparation page.
     * For boss completion, currentAnteConfig has already been updated by advanceToNextBlind().
     */
    private buildBlindPreparedPayload(gameState: GameState): BlindPreparedPayload {
        return {
            blindState: this.buildBlindStateResponse(gameState),
            anteConfig: gameState.blindState.currentAnteConfig,
        };
    }

    /**
     * Generates a runtime id for a concrete shop item instance.
     */
    private createShopItemInstanceId(): string {
        return `shop_item_${this.shopItemInstanceIdCounter++}`;
    }

    /**
     * Builds a generic command error result for non-card actions.
     *
     * Unlike buildActionResult(), this does not emit game:actionResult.
     * It is used by commands such as skipBlind, buyShopItem, rerollShop,
     * and enterNextRound.
     */
    private buildCommandErrorResult(param: { code: number; gameState?: GameState }): GameCommandResult {
        const { code, gameState } = param;

        return {
            code,
            message: CODE_DESCRIPTION[code],
            events: [
                {
                    type: GameSocketEvents.GameError,
                    payload: {
                        code,
                        message: CODE_DESCRIPTION[code],
                    },
                },
            ],
            state: gameState ? this.buildGameStateResponse(gameState) : undefined,
        };
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
