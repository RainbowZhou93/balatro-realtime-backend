import { PokerService } from "./poker.service";

describe("PokerService", () => {
    let service: PokerService;

    beforeEach(() => {
        service = new PokerService();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    it("should detect royal flush", () => {
        const result = service.getCardType(["QH", "10H", "AH", "JH", "KH"]);

        expect(result).toBe(10);
    });
});
