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
    PARAM_ERROR: 357,
} as const;

export const GAME_FLOW_CODE = {
    NO_PLAYS_LEFT: 401, // The current player has no plays left.
    NO_DISCARDS_LEFT: 402, // The current player has no discards left.
} as const;

export const GAME_STATE_CODE = {
    GAME_ALREADY_STARTED: 451, // The game is already in progress.
    GAME_NOT_STARTED: 452, // The game has not been started yet.
    GAME_ALREADY_FINISHED: 453, // The game has already finished, waiting for restart.
    GAME_NOT_FOUND: 454, // Game state not found for the player, possibly due to connection issues or server errors.
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
    INITIAL_TARGET_SCORE: 300,
} as const;

export const CODE_DESCRIPTION = {
    [RESULT_CODE.SUCCESS]: "Success",

    [PLAYER_STATE_CODE.NOT_FOUND]: "Player state not found",

    [REQUEST_PARAM_CODE.EMPTY_SELECTED_CARDS]: "No cards selected",
    [REQUEST_PARAM_CODE.INVALID_CARD_FORMAT]: "Invalid card format",
    [REQUEST_PARAM_CODE.CARD_NOT_IN_HAND]: "Selected card not in hand",
    [REQUEST_PARAM_CODE.CARDS_LIMIT_EXCEEDED]: "Selected cards exceed the limit",
    [REQUEST_PARAM_CODE.DUPLICATE_SELECTED_CARDS]: "Duplicate cards selected",
    [REQUEST_PARAM_CODE.INVALID_ACTION]: "Invalid action",
    [REQUEST_PARAM_CODE.PARAM_ERROR]: "Request parameter error",

    [GAME_FLOW_CODE.NO_PLAYS_LEFT]: "No plays left",
    [GAME_FLOW_CODE.NO_DISCARDS_LEFT]: "No discards left",

    [GAME_STATE_CODE.GAME_ALREADY_STARTED]: "Game already started",
    [GAME_STATE_CODE.GAME_NOT_STARTED]: "Game not started",
    [GAME_STATE_CODE.GAME_ALREADY_FINISHED]: "Game already finished, waiting for restart",
    [GAME_STATE_CODE.GAME_NOT_FOUND]: "Game state not found for player",
} as const;
