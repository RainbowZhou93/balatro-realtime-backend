/**
 * Server-to-client WebSocket event names.
 *
 * Client command names such as initGame or selectCards are handled by Gateway.
 * These events are emitted by the server.
 */
export const GameSocketEvents = {
    GameError: "game:error",

    BlindPrepared: "game:blindPrepared",
    GameInitialized: "game:initialized",
    GameStarted: "game:started",

    ActionResult: "game:actionResult",
    BlindSkipped: "game:blindSkipped",
    BlindOver: "game:blindOver",
    RewardSettled: "game:rewardSettled",
    ShopEntered: "game:shopEntered",
    GameOver: "game:gameOver",

    ShopItemBought: "game:shopItemBought",
    ShopRerolled: "game:shopRerolled",

    StateChanged: "game:stateChanged",
} as const;

export type GameSocketEvent = (typeof GameSocketEvents)[keyof typeof GameSocketEvents];
