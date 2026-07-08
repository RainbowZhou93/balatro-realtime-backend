import { GameEvent } from "./game-event.types";
import { GameStateResponse } from "./game-response.types";
import { AnteConfig } from "./game-state.types";
import { BlindType } from "../configs";

/**
 * Result returned by GameService command methods.
 *
 * Gateway is responsible for sending:
 * - actionResult as game:actionResult when present
 * - events as their own socket events
 * - state as game:stateChanged
 */
export type GameCommandResult = {
    code: number;
    message: string;

    actionResult?: GameActionResult;
    events: GameEvent[];

    state?: GameStateResponse;
};

/**
 * Result of card actions only.
 *
 * It should be used for play / discard.
 * Other commands such as skipBlind, buyShopItem, rerollShop,
 * and enterNextRound should use domain events instead.
 */
export type GameActionResult = PlayActionResult | DiscardActionResult | SkipBlindActionResult | ShopActionResult;

export type PlayActionResult = {
    action: "play";
    scoreDetail?: ScoreDetail;
};

export type DiscardActionResult = {
    action: "discard";
    selectedCards?: string[];
};

export type SkipBlindActionResult = {
    action: "skipBlind";
};

export type ShopActionResult = {
    action: "shop";
};

export type DealResult = {
    code: number;
    message: string;

    playerState?: {
        hand: string[];
        remainingDeckCount: number;
        playsLeft: number;
        discardsLeft: number;
        money: number;
    };

    blindState?: {
        round: number;
        ante: number;
        blindType: BlindType;
        targetScore: number;
        currentAnteConfig: AnteConfig;
    };
};

export type ScoreDetail = {
    selectedCards: string[];
    cardType: number;
    validCards: string[];
    baseScore: number;
    multiplier: number;
};
