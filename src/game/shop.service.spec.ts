import { ShopService } from "./shop.service";
import { SHOP_ITEM_CONFIG } from "./configs";

describe("ShopService", () => {
    let service: ShopService;

    beforeEach(() => {
        service = new ShopService();
    });

    it("should return target count when enough configs are available", () => {
        const items = service.generateShopItems("player-1", 3);

        expect(items).toHaveLength(3);
    });

    it("should create runtime instance ids", () => {
        const items = service.generateShopItems("player-1", 2);

        expect(items[0].instanceId).toBe("shop_item_player-1_0");
        expect(items[1].instanceId).toBe("shop_item_player-1_1");
    });

    it("should increase counter for the same player", () => {
        service.generateShopItems("player-1", 2);
        const nextItems = service.generateShopItems("player-1", 2);

        expect(nextItems[0].instanceId).toBe("shop_item_player-1_2");
        expect(nextItems[1].instanceId).toBe("shop_item_player-1_3");
    });

    it("should keep counters separated for different players", () => {
        const playerOneItems = service.generateShopItems("player-1", 1);
        const playerTwoItems = service.generateShopItems("player-2", 1);

        expect(playerOneItems[0].instanceId).toBe("shop_item_player-1_0");
        expect(playerTwoItems[0].instanceId).toBe("shop_item_player-2_0");
    });

    it("should map config basePrice to instance price", () => {
        const items = service.generateShopItems("player-1", 1);
        const config = SHOP_ITEM_CONFIG.find((item) => item.configId === items[0].configId);

        expect(config).toBeDefined();
        expect(items[0].price).toBe(config!.basePrice);
    });

    it("should not expose enabled/basePrice as runtime fields", () => {
        const items = service.generateShopItems("player-1", 1);

        expect(items[0]).not.toHaveProperty("enabled");
        expect(items[0]).not.toHaveProperty("basePrice");
    });

    it("should not return duplicate configIds in one generation", () => {
        const items = service.generateShopItems("player-1", 3);
        const configIds = items.map((item) => item.configId);

        expect(new Set(configIds).size).toBe(configIds.length);
    });

    it("should create shop item instances from configs", () => {
        const items = service.generateShopItems("player-1", 1);

        expect(items[0]).toMatchObject({
            purchased: false,
        });
        expect(items[0].instanceId).toBeDefined();
        expect(items[0].configId).toBeDefined();
    });
});
