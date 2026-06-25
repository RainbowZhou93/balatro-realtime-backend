export const GameSocketEvents = {
    Error: "game:error",

    InitGame: "game:initialized",
    StartGame: "game:started",

    SkipBlind: "game:blindSkipped",

    ActionResult: "game:actionResult",
    BlindOver: "game:blindOver",
    RewardSettled: "game:rewardSettled",
    ShopEntered: "game:shopEntered",
    GameOver: "game:gameOver",

    ShopItemBought: "game:shopItemBought",
    ShopRerolled: "game:shopRerolled",
    RoundStarted: "game:roundStarted",
    StateChanged: "game:stateChanged",
} as const;

export type GameSocketEvent = (typeof GameSocketEvents)[keyof typeof GameSocketEvents];
