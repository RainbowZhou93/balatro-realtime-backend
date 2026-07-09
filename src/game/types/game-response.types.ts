import { GameStatus } from "../constants";
import { BlindType } from "../configs";
import { ShopStateResponse } from "./shop.types";
import { AnteConfig, PlayerJoker } from "./game-state.types";

/**
 * Client-facing shop item response.
 *
 * effectType is intentionally not exposed for now,
 * because current shop items are only used for purchase flow testing.
 */
export type PlayerStateResponse = {
    hand: string[];
    playsLeft: number;
    discardsLeft: number;
    remainingDeckCount: number;
    money: number;
    currentBlindScore: number;
    currentActionScore: number;
    gameStatus: GameStatus;
    targetScore: number;

    /**
     * Player-owned Jokers.
     *
     * Current stage returns PlayerJoker directly.
     * Joker response DTO may be refined when Joker effects are implemented.
     */
    jokers: PlayerJoker[];
};

export type BlindStateResponse = {
    round: number;
    ante: number;
    blindType: BlindType;
    targetScore: number;
    currentBlindScore: number;
};

/**
 * Latest client-facing game state snapshot.
 *
 * This type only describes the current state.
 * It does not describe how the state changed.
 * Process details are emitted through GameEvent.
 */
export type GameStateResponse = {
    blindState: BlindStateResponse;
    playerState: PlayerStateResponse;
    shopState?: ShopStateResponse;
    gameStatus: GameStatus;
};

/**
 * Payload for game:blindPrepared.
 *
 * Used by the client to render the Ante / Blind preparation page.
 * anteConfig may represent the next ante after a Boss Blind is cleared.
 */
export type BlindPreparedPayload = {
    blindState: BlindStateResponse;
    anteConfig: AnteConfig;
};
