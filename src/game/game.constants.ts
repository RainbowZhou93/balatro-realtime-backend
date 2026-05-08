export const RESULT_CODE = {
    SUCCESS: 200,
} as const;

export const PLAYER_STATE_CODE = {
    NOT_FOUND: 301, // Player state not found; cards may not have been dealt yet, or the connection state is abnormal.
} as const;

export const REQUEST_PARAM_CODE = {
    EMPTY_SELECTED_CARDS: 351, // The client did not select any cards.
    INVALID_CARD_FORMAT: 352, // Invalid card format from the client, for example: ZZ, 100H, ABC.
    CARD_NOT_IN_HAND: 353, // The selected card is not in the current player's hand.
    CARDS_LIMIT_EXCEEDED: 354, // The selected card count exceeds the limit, for example more than 5 cards.
    DUPLICATE_SELECTED_CARDS: 355, // The client submitted the same card multiple times, for example ["AH", "AH"].
    INVALID_ACTION: 356, // The action parameter is invalid, for example: "play", "discardd", or empty.
} as const;

export const GAME_FLOW_CODE = {
    NO_PLAYS_LEFT: 401, // The current player has no plays left.
    NO_DISCARDS_LEFT: 402, // The current player has no discards left.
} as const;

export const SELECT_CARD_ACTION = {
    PLAY: "play",
    DISCARD: "discard",
} as const;

export const GAME_RULE = {
    MAX_SELECT_CARDS: 5,
    INITIAL_PLAYS_LEFT: 5,
    INITIAL_DISCARDS_LEFT: 3,
    DEFAULT_HAND_SIZE: 8,
} as const;
