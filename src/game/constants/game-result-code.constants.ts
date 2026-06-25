export const RESULT_CODE = {
    SUCCESS: 200,
} as const;

export const PLAYER_STATE_CODE = {
    NOT_FOUND: 301,
} as const;

export const REQUEST_PARAM_CODE = {
    EMPTY_SELECTED_CARDS: 351,
    INVALID_CARD_FORMAT: 352,
    CARD_NOT_IN_HAND: 353,
    CARDS_LIMIT_EXCEEDED: 354,
    DUPLICATE_SELECTED_CARDS: 355,
    INVALID_ACTION: 356,
    PARAM_ERROR: 357,
    INVALID_BLIND_STATE: 358,
} as const;

export const GAME_FLOW_CODE = {
    NO_PLAYS_LEFT: 401,
    NO_DISCARDS_LEFT: 402,
} as const;

export const GAME_STATE_CODE = {
    GAME_ALREADY_STARTED: 451,
    GAME_NOT_STARTED: 452,
    GAME_ALREADY_FINISHED: 453,
    GAME_NOT_FOUND: 454,
    INVALID_GAME_STATUS_FOR_SKIP: 455,
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
    [REQUEST_PARAM_CODE.INVALID_BLIND_STATE]: "Invalid blind state for skipping",

    [GAME_FLOW_CODE.NO_PLAYS_LEFT]: "No plays left",
    [GAME_FLOW_CODE.NO_DISCARDS_LEFT]: "No discards left",

    [GAME_STATE_CODE.GAME_ALREADY_STARTED]: "Game already started",
    [GAME_STATE_CODE.GAME_NOT_STARTED]: "Game not started",
    [GAME_STATE_CODE.GAME_ALREADY_FINISHED]: "Game already finished, waiting for restart",
    [GAME_STATE_CODE.GAME_NOT_FOUND]: "Game state not found for player",
    [GAME_STATE_CODE.INVALID_GAME_STATUS_FOR_SKIP]: "Invalid game status for skipping blind",
} as const;
