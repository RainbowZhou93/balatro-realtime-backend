import { ShopItemConfig, ShopItemInstance, ShopItemRarity, ShopItemResponse, ShopState } from "./types";
import { SHOP_ITEM_CONFIG, SHOP_ITEM_TYPE, SHOP_RULE, SHOP_JOKER_RARITY_WEIGHT } from "./configs";
// import { shuffleArray } from "./utils/array.util";
export class ShopService {
    private shopItemInstanceIdCounter: Record<string, number> = {};

    /**
     * Creates a runtime shop state for the current shop phase or refresh.
     *
     * The returned shopState contains runtime item instances, not static configs.
     * Each item has its own instanceId and runtime price,
     * so the client should buy items by instanceId instead of configId.
     */
    public createShopState(playerId: string, count = SHOP_RULE.SHOP_ITEM_COUNT): ShopState {
        const jokerConfigs = this.getAvailableJokerConfigs();
        const selectedConfigs = this.pickJokerConfigs(jokerConfigs, count);

        const items: ShopItemInstance[] = selectedConfigs.map((config) =>
            this.createShopItemInstance(playerId, config),
        );
        return {
            items,
            rerollCost: SHOP_RULE.DEFAULT_REROLL_COST,
        };
    }

    public rerollShopState(playerId: string, currentRerollCost: number, count: number): ShopState {
        const jokerConfigs = this.getAvailableJokerConfigs();
        const selectedConfigs = this.pickJokerConfigs(jokerConfigs, count);

        const items: ShopItemInstance[] = selectedConfigs.map((config) =>
            this.createShopItemInstance(playerId, config),
        );
        return {
            items,
            rerollCost: currentRerollCost++,
        };
    }

    public buildShopItemsResponse(shopState: ShopState): ShopItemResponse[] {
        return shopState.items.map((shopItem) => ({
            instanceId: shopItem.instanceId,
            configId: shopItem.configId,
            name: shopItem.name,
            type: shopItem.type,
            price: shopItem.price,
            description: shopItem.description,
            purchased: shopItem.purchased,
        }));
    }

    /**
     * Gets all enabled Joker configs that can appear in the shop.
     *
     * At this stage, the shop only generates Joker items.
     * Tarot / Planet / Voucher item pools can be added later.
     */
    private getAvailableJokerConfigs(): ShopItemConfig[] {
        return SHOP_ITEM_CONFIG.filter((item) => item.type === SHOP_ITEM_TYPE.JOKER && item.enabled);
    }

    /**
     * Converts a static item config into a runtime shop item instance.
     *
     * basePrice belongs to the config layer,
     * while price represents the actual runtime shop price.
     */
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

    /**
     * Picks Joker configs for one shop generation.
     *
     * The current strategy is:
     * 1. Pick a Joker rarity by configured rarity weight.
     * 2. Pick one config from that rarity pool.
     * 3. Avoid duplicate configIds in the same shop generation.
     * 4. Fallback to any remaining config if the selected rarity has no candidates.
     */
    private pickJokerConfigs(configs: ShopItemConfig[], count: number): ShopItemConfig[] {
        const selectedConfigs: ShopItemConfig[] = [];
        const selectedConfigIds = new Set<number>();

        while (selectedConfigs.length < count) {
            const selectedRarity = this.pickJokerRarity();
            const selectedConfig = this.pickOneConfigByRarity(configs, selectedRarity, selectedConfigIds);

            if (!selectedConfig) {
                break;
            }

            selectedConfigs.push(selectedConfig);
            selectedConfigIds.add(selectedConfig.configId);
        }

        return selectedConfigs;
    }

    /**
     * Generates a player-scoped runtime id for a concrete shop item instance.
     *
     * This id is only used for the current in-memory shop flow.
     * It can be replaced later if persistence or distributed deployment is introduced.
     */
    private createShopItemInstanceId(playerId: string): string {
        if (this.shopItemInstanceIdCounter[playerId] === undefined) {
            this.shopItemInstanceIdCounter[playerId] = 0;
        }
        return `shop_item_${playerId}_${this.shopItemInstanceIdCounter[playerId]++}`;
    }

    /**
     * Picks a Joker rarity based on SHOP_JOKER_RARITY_WEIGHT.
     *
     * This controls the rarity distribution first,
     * then the concrete Joker is selected from that rarity pool.
     */
    private pickJokerRarity(): ShopItemRarity {
        const rarityEntries = Object.entries(SHOP_JOKER_RARITY_WEIGHT) as [ShopItemRarity, number][];

        const totalWeight = rarityEntries.reduce((sum, [, weight]) => sum + weight, 0);
        const randomWeight = Math.floor(Math.random() * totalWeight);

        let cumulativeWeight = 0;

        for (const [rarity, weight] of rarityEntries) {
            cumulativeWeight += weight;

            if (randomWeight < cumulativeWeight) {
                return rarity;
            }
        }

        return rarityEntries[rarityEntries.length - 1][0];
    }

    /**
     * Picks one config from the selected rarity pool.
     *
     * If that rarity has no remaining candidates, fallback to all remaining configs.
     * This prevents the shop from returning fewer items just because one rarity pool is empty.
     */
    private pickOneConfigByRarity(
        configs: ShopItemConfig[],
        rarity: ShopItemRarity,
        selectedConfigIds: Set<number>,
    ): ShopItemConfig | null {
        const rarityConfigs = configs.filter(
            (config) => config.rarity === rarity && !selectedConfigIds.has(config.configId),
        );

        if (rarityConfigs.length > 0) {
            return this.pickRandomConfig(rarityConfigs);
        }

        const fallbackConfigs = configs.filter((config) => !selectedConfigIds.has(config.configId));

        if (fallbackConfigs.length === 0) {
            return null;
        }

        return this.pickRandomConfig(fallbackConfigs);
    }

    /**
     * Picks one random config from a non-empty config list.
     */
    private pickRandomConfig(configs: ShopItemConfig[]): ShopItemConfig | null {
        if (configs.length === 0) {
            return null;
        }

        return configs[Math.floor(Math.random() * configs.length)];
    }
}
