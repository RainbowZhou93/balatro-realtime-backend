import { PokerService } from "./poker.service";

describe("PokerService.getCardType", () => {
    let service: PokerService;

    beforeAll(() => {
        console.info(
            "[PokerService.spec] getCardType coverage: royal flush, straight flush, four of a kind, full house, flush, straight, three of a kind, two pair, one pair, high card, invalid suit, invalid rank.",
        );
    });

    beforeEach(() => {
        service = new PokerService();
        console.info(`[PokerService.spec] Case: ${expect.getState().currentTestName}`);
    });

    it("royal flush — 10 J Q K A of the same suit, returns 10", () => {
        expect(service.getCardType(["10H", "JH", "QH", "KH", "AH"])).toBe(10);
    });

    it("royal flush — still detected when cards are out of order", () => {
        expect(service.getCardType(["QH", "10H", "AH", "JH", "KH"])).toBe(10);
    });

    it("straight flush — suited consecutive ranks (not 10-A), returns 9", () => {
        expect(service.getCardType(["5D", "6D", "7D", "8D", "9D"])).toBe(9);
    });

    it("straight flush — A-2-3-4-5 suited with A as low card, returns 9", () => {
        expect(service.getCardType(["AH", "2H", "3H", "4H", "5H"])).toBe(9);
    });

    it("four of a kind — four cards of the same rank, returns 8", () => {
        expect(service.getCardType(["7H", "7D", "7S", "7C", "KH"])).toBe(8);
    });

    it("full house — three of a kind plus a pair, returns 7", () => {
        expect(service.getCardType(["9H", "9D", "9S", "2H", "2C"])).toBe(7);
    });

    it("flush — five cards of the same suit, not a straight, returns 6", () => {
        expect(service.getCardType(["2H", "5H", "7H", "9H", "JH"])).toBe(6);
    });

    it("straight — five consecutive ranks, not same suit, returns 5", () => {
        expect(service.getCardType(["4H", "5D", "6S", "7C", "8H"])).toBe(5);
    });

    it("straight — A-2-3-4-5 with A as low card (not same suit), returns 5", () => {
        expect(service.getCardType(["AH", "2D", "3S", "4C", "5H"])).toBe(5);
    });

    it("three of a kind — three cards of the same rank, no pair, returns 4", () => {
        expect(service.getCardType(["JH", "JD", "JS", "3H", "7C"])).toBe(4);
    });

    it("two pair — two distinct pairs, returns 3", () => {
        expect(service.getCardType(["KH", "KD", "4S", "4C", "9H"])).toBe(3);
    });

    it("one pair — exactly one pair, returns 2", () => {
        expect(service.getCardType(["AH", "AD", "3S", "7C", "10H"])).toBe(2);
    });

    it("high card — no matching hand, returns 1", () => {
        expect(service.getCardType(["2H", "5D", "7S", "9C", "JH"])).toBe(1);
    });

    it("invalid card — unknown suit should throw", () => {
        expect(() => service.getCardType(["5X"])).toThrow();
    });

    it("invalid card — unknown rank should throw", () => {
        expect(() => service.getCardType(["ZH"])).toThrow();
    });
});
