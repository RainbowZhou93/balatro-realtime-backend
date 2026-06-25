export const GAME_RULE = {
    MAX_SELECT_CARDS: 5,
    INITIAL_PLAYS_LEFT: 5,
    INITIAL_DISCARDS_LEFT: 3,
    DEFAULT_HAND_SIZE: 8,
} as const;

export const SELECT_CARD_ACTION = {
    PLAY: "play",
    DISCARD: "discard",
} as const;
