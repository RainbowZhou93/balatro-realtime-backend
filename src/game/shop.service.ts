import { ShopItemConfig, ShopItemInstance } from "./types";
import { SHOP_ITEM_CONFIG, SHOP_ITEM_TYPE, SHOP_RULE } from "./configs";
import { shuffleArray } from "./utils/array.util";

export class ShopService {
    private shopItemInstanceIdCounter: Record<string, number> = {};

    public generateShopItems(playerId: string, count = SHOP_RULE.SHOP_ITEM_COUNT): ShopItemInstance[] {
        const jokerConfigs = this.getAvailableJokerConfigs();
        const selectedConfigs = this.pickJokerConfigs(jokerConfigs, count);

        return selectedConfigs.map((config) => this.createShopItemInstance(playerId, config));
    }

    private getAvailableJokerConfigs(): ShopItemConfig[] {
        return SHOP_ITEM_CONFIG.filter((item) => item.type === SHOP_ITEM_TYPE.JOKER && item.enabled);
    }

    private createShopItemInstance(playerId: string, config: ShopItemConfig): ShopItemInstance {
        return {
            instanceId: this.createShopItemInstanceId(playerId),
            configId: config.configId,
            name: config.name,
            type: config.type,
            rarity: config.rarity,
            price: config.basePrice,
            description: config.description,
            effectType: config.effectType,
            purchased: false,
        };
    }

    private pickJokerConfigs(configs: ShopItemConfig[], count: number): ShopItemConfig[] {
        return shuffleArray(configs).slice(0, count);
    }

    /**
     * Generates a runtime id for a concrete shop item instance.
     */
    private createShopItemInstanceId(playerId: string): string {
        if (!this.shopItemInstanceIdCounter[playerId]) {
            this.shopItemInstanceIdCounter[playerId] = 0;
        }
        return `shop_item_${playerId}_${this.shopItemInstanceIdCounter[playerId]++}`;
    }
}
