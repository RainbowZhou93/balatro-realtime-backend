import { PokerService } from "./poker.service";
import { CARD_TYPE } from "./poker.constants";
import { BOSS_BLIND_CODE } from "./boss.config";

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

    it("should identify straight flush", () => {
        const result = service.getCardType(["5D", "6D", "7D", "8D", "9D"]);

        expect(result.cardType).toBe(CARD_TYPE.straightFlush);
        expect(result.validCards).toHaveLength(5);
    });

    it("should identify A-2-3-4-5 as straight flush when suited", () => {
        const result = service.getCardType(["AH", "2H", "3H", "4H", "5H"]);

        expect(result.cardType).toBe(CARD_TYPE.straightFlush);
        expect(result.validCards).toHaveLength(5);
    });

    it("should identify four of a kind and return only the 4 matching cards", () => {
        const result = service.getCardType(["7H", "7D", "7S", "7C", "KH"]);

        expect(result.cardType).toBe(CARD_TYPE.fourOfAKind);
        expect(result.validCards).toHaveLength(4);
        expect(result.validCards.every((card) => card.rank === 7)).toBe(true);
    });

    it("should identify full house", () => {
        const result = service.getCardType(["9H", "9D", "9S", "2H", "2C"]);

        expect(result.cardType).toBe(CARD_TYPE.fullHouse);
        expect(result.validCards).toHaveLength(5);
    });

    it("should identify flush", () => {
        const result = service.getCardType(["2H", "5H", "7H", "9H", "JH"]);

        expect(result.cardType).toBe(CARD_TYPE.flush);
        expect(result.validCards).toHaveLength(5);
    });

    it("should identify straight", () => {
        const result = service.getCardType(["4H", "5D", "6S", "7C", "8H"]);

        expect(result.cardType).toBe(CARD_TYPE.straight);
        expect(result.validCards).toHaveLength(5);
    });

    it("should identify A-2-3-4-5 as straight when unsuited", () => {
        const result = service.getCardType(["AH", "2D", "3S", "4C", "5H"]);

        expect(result.cardType).toBe(CARD_TYPE.straight);
        expect(result.validCards).toHaveLength(5);
    });

    it("should identify three of a kind and return only the 3 matching cards", () => {
        const result = service.getCardType(["JH", "JD", "JS", "3H", "7C"]);

        expect(result.cardType).toBe(CARD_TYPE.threeOfAKind);
        expect(result.validCards).toHaveLength(3);
        expect(result.validCards.every((card) => card.rank === 11)).toBe(true);
    });

    it("should identify two pair and return only paired cards", () => {
        const result = service.getCardType(["KH", "KD", "4S", "4C", "9H"]);

        expect(result.cardType).toBe(CARD_TYPE.twoPair);
        expect(result.validCards).toHaveLength(4);
        const ranks = result.validCards.map((card) => card.rank).sort((a, b) => a - b);
        expect(ranks).toEqual([4, 4, 13, 13]);
    });

    it("should identify one pair and return only paired cards", () => {
        const result = service.getCardType(["AH", "AD", "3S", "7C", "10H"]);

        expect(result.cardType).toBe(CARD_TYPE.onePair);
        expect(result.validCards).toHaveLength(2);
        expect(result.validCards.every((card) => card.rank === 14)).toBe(true);
    });

    it("should identify high card and return the highest single card", () => {
        const result = service.getCardType(["2H", "5D", "7S", "9C", "JH"]);

        expect(result.cardType).toBe(CARD_TYPE.highCard);
        expect(result.validCards).toHaveLength(1);
        expect(result.validCards[0].rank).toBe(11);
    });

    it("should identify high card correctly for less than 5 cards", () => {
        const result = service.getCardType(["10H", "JD", "3S"]);

        expect(result.cardType).toBe(CARD_TYPE.highCard);
        expect(result.validCards).toHaveLength(1);
        expect(result.validCards[0].rank).toBe(11);
    });

    it("should throw for invalid suit", () => {
        expect(() => service.getCardType(["5X"])).toThrow("Invalid card format");
    });

    it("should throw for invalid rank", () => {
        expect(() => service.getCardType(["ZH"])).toThrow("Invalid card format");
    });
});

describe("PokerService.calculateHandScore", () => {
    let service: PokerService;

    beforeEach(() => {
        service = new PokerService();
        console.info(`[PokerService.spec] Case: ${expect.getState().currentTestName}`);
    });

    it("should score normally when no boss effect is applied", () => {
        const result = service.calculateHandScore(["AH", "QH", "9H", "6H", "3H"], -1);

        expect(result.handType).toBe(CARD_TYPE.flush);
        expect(result.baseScore).toBeGreaterThan(0);
        expect(result.multiplier).toBeGreaterThan(0);
        expect(result.validCards).toHaveLength(5);
    });

    it("should return zero score when disableSuit removes all selected cards", () => {
        const result = service.calculateHandScore(
            ["AH", "QH", "9H", "6H", "3H"],
            BOSS_BLIND_CODE.THE_HEART,
        );

        expect(result.baseScore).toBe(0);
        expect(result.multiplier).toBe(0);
        expect(result.handType).toBe(CARD_TYPE.highCard);
        expect(result.validCards).toEqual([]);
    });

    it("should ignore only disabled suit cards and score with remaining cards", () => {
        const result = service.calculateHandScore(
            ["AC", "AD", "AH", "AS", "2D"],
            BOSS_BLIND_CODE.THE_CLUB,
        );

        expect(result.handType).toBe(CARD_TYPE.threeOfAKind);
        expect(result.baseScore).toBeGreaterThan(0);
        expect(result.multiplier).toBeGreaterThan(0);
        expect(result.validCards).toEqual(expect.arrayContaining(["AD", "AH", "AS"]));
        expect(result.validCards).not.toContain("AC");
    });

    it("should zero out score when boss disables the current hand type", () => {
        const result = service.calculateHandScore(
            ["AH", "QH", "9H", "6H", "3H"],
            BOSS_BLIND_CODE.THE_FLUSH,
        );

        expect(result.handType).toBe(CARD_TYPE.flush);
        expect(result.baseScore).toBe(0);
        expect(result.multiplier).toBe(0);
        expect(result.validCards).toEqual([]);
    });

    it("should still score when boss disables a different hand type", () => {
        const result = service.calculateHandScore(
            ["AH", "AD", "7S", "5C", "2D"],
            BOSS_BLIND_CODE.THE_STRAIGHT,
        );

        expect(result.handType).toBe(CARD_TYPE.onePair);
        expect(result.baseScore).toBeGreaterThan(0);
        expect(result.multiplier).toBeGreaterThan(0);
        expect(result.validCards).toEqual(expect.arrayContaining(["AH", "AD"]));
    });

    it("should zero out score when high card is disabled and hand is high card", () => {
        const result = service.calculateHandScore(
            ["AH", "KD", "9S", "6C", "2D"],
            BOSS_BLIND_CODE.THE_HIGH_CARD,
        );

        expect(result.handType).toBe(CARD_TYPE.highCard);
        expect(result.baseScore).toBe(0);
        expect(result.multiplier).toBe(0);
        expect(result.validCards).toEqual([]);
    });
});
