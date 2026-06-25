export type GameEvent = BlindOverEvent | RewardSettledEvent | ShopEnteredEvent | GameOverEvent;

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

export type GameOverEvent = {
    type: typeof GameSocketEvents.GameOver;
    payload: {
        reason: "blind_failed" | "run_completed";
    };
};