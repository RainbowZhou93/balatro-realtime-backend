/**
 * Domain events emitted by GameService.
 *
 * GameEvent describes what happened during a command.
 * The latest full state snapshot is returned separately as GameStateResponse.
 *
 * Example:
 * selectCards may emit blindOver, rewardSettled, shopEntered,
 * and then Gateway sends stateChanged with the final snapshot.
 */
import { GameSocketEvents } from "../constants";
import { PlayResult, SkippableBlindType } from "./game-state.types";
import { BlindStateResponse, BlindPreparedPayload } from "./game-response.types";
import { RewardMoneyDetail } from "./game-economy.types";
import { ShopStateResponse } from "./shop.types";
import { TagCode } from "../configs";
import { ShopItemBoughtPayload } from "./shop.types";

export type BlindOverEvent = {
    type: typeof GameSocketEvents.BlindOver;
    payload: {
        result: PlayResult;
        blindState: BlindStateResponse;
    };
};

export type RewardSettledEvent = {
    type: typeof GameSocketEvents.RewardSettled;
    payload: RewardMoneyDetail;
};

export type ShopEnteredEvent = {
    type: typeof GameSocketEvents.ShopEntered;
    payload: ShopStateResponse;
};

export type ShopItemBoughtEvent = {
    type: typeof GameSocketEvents.ShopItemBought;
    payload: ShopItemBoughtPayload;
};

export type ShopRerolledEvent = {
    type: typeof GameSocketEvents.ShopRerolled;
    payload: {
        cost: number;
        shopState: ShopStateResponse;
        moneyAfterReroll: number;
    };
};

export type GameOverEvent = {
    type: typeof GameSocketEvents.GameOver;
    payload: {
        reason: "blind_failed" | "run_completed";
    };
};

export type BlindSkippedEvent = {
    type: typeof GameSocketEvents.BlindSkipped;
    payload: {
        blindType: SkippableBlindType;
        tagCode: TagCode;
    };
};

/**
 * Emitted when the next Blind is ready to be displayed.
 *
 * This does not mean cards are dealt.
 * The client should call startGame after this event.
 */
export type BlindPreparedEvent = {
    type: typeof GameSocketEvents.BlindPrepared;
    payload: BlindPreparedPayload;
};

export type GameErrorEvent = {
    type: typeof GameSocketEvents.GameError;
    payload: {
        code: number;
        message: string;
    };
};

export type GameEvent =
    | BlindOverEvent
    | RewardSettledEvent
    | ShopEnteredEvent
    | ShopItemBoughtEvent
    | ShopRerolledEvent
    | GameOverEvent
    | BlindSkippedEvent
    | BlindPreparedEvent
    | GameErrorEvent;
