import { ShopService } from "./shop.service";
import { SHOP_ITEM_CONFIG, SHOP_RULE } from "./configs";

describe("ShopService", () => {
    let service: ShopService;

    beforeEach(() => {
        service = new ShopService();
    });

    it("should return target count when enough configs are available and include rerollCost", () => {
        const state = service.createShopState("player-1", 3);
        const items = state.items;

        expect(items).toHaveLength(3);
        expect(state.rerollCost).toBe(SHOP_RULE.DEFAULT_REROLL_COST);
    });

    it("should create runtime instance ids", () => {
        const state = service.createShopState("player-1", 2);
        const items = state.items;

        expect(items[0].instanceId).toBe("shop_item_player-1_0");
        expect(items[1].instanceId).toBe("shop_item_player-1_1");
    });

    it("should increase counter for the same player", () => {
        service.createShopState("player-1", 2);
        const nextState = service.createShopState("player-1", 2);
        const nextItems = nextState.items;

        expect(nextItems[0].instanceId).toBe("shop_item_player-1_2");
        expect(nextItems[1].instanceId).toBe("shop_item_player-1_3");
    });

    it("should keep counters separated for different players", () => {
        const playerOneState = service.createShopState("player-1", 1);
        const playerTwoState = service.createShopState("player-2", 1);
        const playerOneItems = playerOneState.items;
        const playerTwoItems = playerTwoState.items;

        expect(playerOneItems[0].instanceId).toBe("shop_item_player-1_0");
        expect(playerTwoItems[0].instanceId).toBe("shop_item_player-2_0");
    });

    it("should map config basePrice to instance price", () => {
        const state = service.createShopState("player-1", 1);
        const items = state.items;
        const config = SHOP_ITEM_CONFIG.find((item) => item.configId === items[0].configId);

        expect(config).toBeDefined();
        expect(items[0].price).toBe(config!.basePrice);
    });

    it("should not expose enabled/basePrice as runtime fields", () => {
        const state = service.createShopState("player-1", 1);
        const items = state.items;

        expect(items[0]).not.toHaveProperty("enabled");
        expect(items[0]).not.toHaveProperty("basePrice");
    });

    it("should not return duplicate configIds in one generation", () => {
        const state = service.createShopState("player-1", 3);
        const items = state.items;
        const configIds = items.map((item) => item.configId);

        expect(new Set(configIds).size).toBe(configIds.length);
    });

    it("should create shop item instances from configs", () => {
        const state = service.createShopState("player-1", 1);
        const items = state.items;

        expect(items[0]).toMatchObject({
            purchased: false,
        });
        expect(items[0].instanceId).toBeDefined();
        expect(items[0].configId).toBeDefined();
    });

    it("should generate items from shop item configs", () => {
        const state = service.createShopState("player-1", 3);
        const items = state.items;
        const configIds = SHOP_ITEM_CONFIG.map((config) => config.configId);

        for (const item of items) {
            expect(configIds).toContain(item.configId);
        }
    });
});
