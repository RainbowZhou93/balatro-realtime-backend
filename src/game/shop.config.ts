/**
 * Minimal shop configuration for the current shop flow.
 *
 * Current items are placeholder Joker products used to verify:
 * - shop entry
 * - item purchase
 * - shop reroll
 * - owned Joker state
 *
 * Real Joker effects will be implemented in a later stage.
 */
export const SHOP_RULE = {
    SHOP_ITEM_COUNT: 2,
    DEFAULT_REROLL_COST: 5,
} as const;

export const SHOP_ITEM_TYPE = {
    JOKER: "joker",
} as const;

/**
 * Current effect type only describes how the purchased item enters player state.
 * It does not execute Joker scoring effects yet.
 */
export const SHOP_ITEM_EFFECT_TYPE = {
    ADD_TO_JOKER_SLOTS: "add_to_joker_slots",
} as const;

export const SHOP_ITEM_CONFIG = [
    {
        configId: 1001,
        name: "Joker",
        type: SHOP_ITEM_TYPE.JOKER,
        basePrice: 1,
        description: "+4 Mult. Current stage only stores it, effect will be implemented later.",
        effectType: SHOP_ITEM_EFFECT_TYPE.ADD_TO_JOKER_SLOTS,
    },
    {
        configId: 1002,
        name: "Greedy Joker",
        type: SHOP_ITEM_TYPE.JOKER,
        basePrice: 2,
        description: "A placeholder Joker item for shop flow testing.",
        effectType: SHOP_ITEM_EFFECT_TYPE.ADD_TO_JOKER_SLOTS,
    },
    {
        configId: 1003,
        name: "Lucky Joker",
        type: SHOP_ITEM_TYPE.JOKER,
        basePrice: 1,
        description: "A placeholder Joker item for shop flow testing.",
        effectType: SHOP_ITEM_EFFECT_TYPE.ADD_TO_JOKER_SLOTS,
    },
] as const;
