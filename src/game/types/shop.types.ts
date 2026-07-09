import { SHOP_ITEM_TYPE, SHOP_ITEM_RARITY, SHOP_ITEM_EFFECT_TYPE, SHOP_ITEM_CONFIG } from "../configs/shop.config";

export type ShopItemType = (typeof SHOP_ITEM_TYPE)[keyof typeof SHOP_ITEM_TYPE];
export type ShopItemRarity = (typeof SHOP_ITEM_RARITY)[keyof typeof SHOP_ITEM_RARITY];
export type ShopItemEffectType = (typeof SHOP_ITEM_EFFECT_TYPE)[keyof typeof SHOP_ITEM_EFFECT_TYPE];
export type ShopItemConfigId = (typeof SHOP_ITEM_CONFIG)[number];

export type ShopState = {
    items: ShopItemInstance[];
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
    item: ShopItemResponse[];
    moneyAfterPurchase: number;
};

export type ShopItemConfig = {
    configId: number;
    name: string;
    type: ShopItemType;
    rarity: ShopItemRarity;
    basePrice: number;
    enabled: boolean;
    description: string;
    effectType: ShopItemEffectType;
};

export type ShopItemInstance = {
    instanceId: string;
    configId: number;
    name: string;
    type: ShopItemType;
    rarity: ShopItemRarity;
    price: number;
    description: string;
    effectType: ShopItemEffectType;
    purchased: boolean;
};
