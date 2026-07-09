import { ShopItemConfig } from "../types/shop.types";
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

export const SHOP_ITEM_RARITY = {
    COMMON: "common",
    UNCOMMON: "uncommon",
    RARE: "rare",
} as const;

export const SHOP_JOKER_RARITY_WEIGHT = {
    [SHOP_ITEM_RARITY.COMMON]: 70,
    [SHOP_ITEM_RARITY.UNCOMMON]: 25,
    [SHOP_ITEM_RARITY.RARE]: 5,
} as const;

/**
 * Current effect type only describes how the purchased item enters player state.
 * It does not execute Joker scoring effects yet.
 */
export const SHOP_ITEM_EFFECT_TYPE = {
    ADD_TO_JOKER_SLOTS: "add_to_joker_slots",
} as const;

// Joker configId: 1001 - 1999
// Tarot configId: 2001 - 2999
// Planet configId: 3001 - 3999
export const SHOP_ITEM_CONFIG: ShopItemConfig[] = [
    {
        configId: 1001,
        name: "Joker",
        type: SHOP_ITEM_TYPE.JOKER,
        rarity: SHOP_ITEM_RARITY.COMMON,
        basePrice: 5,
        enabled: true,
        description: "+4 Mult. Current stage only stores it, effect will be implemented later.",
        effectType: SHOP_ITEM_EFFECT_TYPE.ADD_TO_JOKER_SLOTS,
    },
    {
        configId: 1002,
        name: "Greedy Joker",
        type: SHOP_ITEM_TYPE.JOKER,
        rarity: SHOP_ITEM_RARITY.COMMON,
        basePrice: 5,
        enabled: true,
        description: "Played Diamond cards give +3 Mult when scored. Effect will be implemented later.",
        effectType: SHOP_ITEM_EFFECT_TYPE.ADD_TO_JOKER_SLOTS,
    },
    {
        configId: 1003,
        name: "Lusty Joker",
        type: SHOP_ITEM_TYPE.JOKER,
        rarity: SHOP_ITEM_RARITY.COMMON,
        basePrice: 5,
        enabled: true,
        description: "Played Heart cards give +3 Mult when scored. Effect will be implemented later.",
        effectType: SHOP_ITEM_EFFECT_TYPE.ADD_TO_JOKER_SLOTS,
    },
    {
        configId: 1004,
        name: "Wrathful Joker",
        type: SHOP_ITEM_TYPE.JOKER,
        rarity: SHOP_ITEM_RARITY.COMMON,
        basePrice: 5,
        enabled: true,
        description: "Played Spade cards give +3 Mult when scored. Effect will be implemented later.",
        effectType: SHOP_ITEM_EFFECT_TYPE.ADD_TO_JOKER_SLOTS,
    },
    {
        configId: 1005,
        name: "Gluttonous Joker",
        type: SHOP_ITEM_TYPE.JOKER,
        rarity: SHOP_ITEM_RARITY.COMMON,
        basePrice: 5,
        enabled: true,
        description: "Played Club cards give +3 Mult when scored. Effect will be implemented later.",
        effectType: SHOP_ITEM_EFFECT_TYPE.ADD_TO_JOKER_SLOTS,
    },
    {
        configId: 1006,
        name: "Jolly Joker",
        type: SHOP_ITEM_TYPE.JOKER,
        rarity: SHOP_ITEM_RARITY.COMMON,
        basePrice: 3,
        enabled: true,
        description: "+8 Mult if played hand contains a Pair. Effect will be implemented later.",
        effectType: SHOP_ITEM_EFFECT_TYPE.ADD_TO_JOKER_SLOTS,
    },
    {
        configId: 1007,
        name: "Zany Joker",
        type: SHOP_ITEM_TYPE.JOKER,
        rarity: SHOP_ITEM_RARITY.COMMON,
        basePrice: 4,
        enabled: true,
        description: "+12 Mult if played hand contains Three of a Kind. Effect will be implemented later.",
        effectType: SHOP_ITEM_EFFECT_TYPE.ADD_TO_JOKER_SLOTS,
    },
    {
        configId: 1008,
        name: "Joker Stencil",
        type: SHOP_ITEM_TYPE.JOKER,
        rarity: SHOP_ITEM_RARITY.UNCOMMON,
        basePrice: 8,
        enabled: true,
        description: "X Mult based on empty Joker slots. Effect will be implemented later.",
        effectType: SHOP_ITEM_EFFECT_TYPE.ADD_TO_JOKER_SLOTS,
    },
    {
        configId: 1009,
        name: "Four Fingers",
        type: SHOP_ITEM_TYPE.JOKER,
        rarity: SHOP_ITEM_RARITY.UNCOMMON,
        basePrice: 7,
        enabled: true,
        description: "Flushes and Straights can be made with 4 cards. Effect will be implemented later.",
        effectType: SHOP_ITEM_EFFECT_TYPE.ADD_TO_JOKER_SLOTS,
    },
    {
        configId: 1010,
        name: "DNA",
        type: SHOP_ITEM_TYPE.JOKER,
        rarity: SHOP_ITEM_RARITY.RARE,
        basePrice: 8,
        enabled: true,
        description:
            "If first hand of round has only 1 card, add a permanent copy to deck and draw it. Effect will be implemented later.",
        effectType: SHOP_ITEM_EFFECT_TYPE.ADD_TO_JOKER_SLOTS,
    },
] as const;

export const jokerPool = SHOP_ITEM_CONFIG.filter((item) => item.type === SHOP_ITEM_TYPE.JOKER);
