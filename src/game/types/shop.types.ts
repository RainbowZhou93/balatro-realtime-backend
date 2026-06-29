import { SHOP_ITEM_CONFIG, SHOP_ITEM_EFFECT_TYPE, SHOP_ITEM_TYPE } from "../shop.config";

export type ShopItemType = (typeof SHOP_ITEM_TYPE)[keyof typeof SHOP_ITEM_TYPE];

export type ShopItemEffectType = (typeof SHOP_ITEM_EFFECT_TYPE)[keyof typeof SHOP_ITEM_EFFECT_TYPE];

export type ShopItemConfig = (typeof SHOP_ITEM_CONFIG)[number];

/**
 * Runtime shop item generated from static shop item config.
 *
 * ShopItem represents a concrete item in the current shop.
 * It has runtime fields such as instanceId and purchased.
 */
export type ShopItem = {
    instanceId: string;
    configId: number;
    name: string;
    type: ShopItemType;
    price: number;
    description: string;
    effectType: ShopItemEffectType;
    purchased: boolean;
};

export type ShopState = {
    items: ShopItem[];
    rerollCost: number;
};

export type ShopItemResponse = {
    instanceId: string;
    configId: number;
    name: string;
    type: ShopItemType;
    price: number;
    description: string;
    purchased: boolean;
};

export type ShopStateResponse = {
    items: ShopItemResponse[];
    rerollCost: number;
};

/**
 * Payload emitted when a shop item is bought.
 *
 * This event describes the transaction result,
 * while playerState.jokers in game:stateChanged describes owned Jokers.
 */
export type ShopItemBoughtPayload = {
    item: ShopItemResponse;
    moneyAfterPurchase: number;
};
