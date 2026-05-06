import { PokerService } from "./poker.service";
import type { GameState } from "./poker.types";

describe("PokerService.getCardType", () => {
    let service: PokerService;

    beforeEach(() => {
        service = new PokerService();
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

describe("PokerService.dealCards", () => {
    let service: PokerService;

    beforeEach(() => {
        service = new PokerService();
    });

    // Helper: access private gameStates directly
    function getGameState(playerId: string): GameState | undefined {
        return (service as unknown as { gameStates: Record<string, GameState> }).gameStates[playerId];
    }

    describe("First round (round = 1)", () => {
        it("should initialize player state and return the requested number of cards", () => {
            const result = service.dealCards({ playerId: "p1", handSize: 5, round: 1 });

            expect(result.hand).toHaveLength(5);
            expect(result.remainingDeckCount).toBe(52 - 5);
            expect(result.playsLeft).toBe(5);
        });

        it("should return only valid cards", () => {
            const validSuits = new Set(["H", "S", "D", "C"]);
            const { hand } = service.dealCards({ playerId: "p2", handSize: 8, round: 1 });

            for (const card of hand) {
                const suit = card.slice(-1);
                const rankStr = card.slice(0, -1);
                const rankMap: Record<string, number> = { J: 11, Q: 12, K: 13, A: 14 };
                const rank = rankMap[rankStr] ?? Number(rankStr);

                expect(validSuits.has(suit)).toBe(true);
                expect(Number.isNaN(rank)).toBe(false);
                expect(rank).toBeGreaterThanOrEqual(2);
                expect(rank).toBeLessThanOrEqual(14);
            }
        });

        it("should reuse existing state when dealing again with round = 1", () => {
            // First deal: take 5 cards from a full 52-card deck
            service.dealCards({ playerId: "p3", handSize: 5, round: 1 });
            const deckAfterFirst = getGameState("p3")!.deck.length;

            // Second deal with round=1: reuse existing state, continue drawing from remaining deck
            const result = service.dealCards({ playerId: "p3", handSize: 5, round: 1 });
            expect(result.hand).toHaveLength(5);
            // Deck should keep shrinking, not reset to 52
            expect(result.remainingDeckCount).toBe(deckAfterFirst - 5);
        });

        it("should keep different players' states independent", () => {
            service.dealCards({ playerId: "playerA", handSize: 5, round: 1 });
            service.dealCards({ playerId: "playerB", handSize: 5, round: 1 });

            expect(getGameState("playerA")!.deck).toHaveLength(52 - 5);
            expect(getGameState("playerB")!.deck).toHaveLength(52 - 5);
        });
    });

    describe("Subsequent rounds (round > 1)", () => {
        it("should deal from the existing deck and update playsLeft", () => {
            service.dealCards({ playerId: "p4", handSize: 5, round: 1 });
            const playsLeftBefore = getGameState("p4")!.playsLeft;

            const result = service.dealCards({ playerId: "p4", handSize: 5, round: 2 });

            expect(result.hand).toHaveLength(5);
            expect(result.playsLeft).toBe(playsLeftBefore - 1);
            expect(result.remainingDeckCount).toBe(52 - 10); // two deals of 5
        });

        it("should return an empty result if player state does not exist", () => {
            const result = service.dealCards({ playerId: "ghost", handSize: 5, round: 2 });

            expect(result.hand).toHaveLength(0);
            expect(result.remainingDeckCount).toBe(0);
            expect(result.playsLeft).toBe(0);
        });
    });

    describe("Edge cases", () => {
        it("should return all remaining cards when requested count exceeds deck size", () => {
            service.dealCards({ playerId: "p5", handSize: 50, round: 1 });
            // 2 cards remain; request 5
            const result = service.dealCards({ playerId: "p5", handSize: 5, round: 2 });

            expect(result.hand).toHaveLength(2);
            expect(result.remainingDeckCount).toBe(0);
        });

        it("should return an empty hand and keep deck unchanged when handSize is 0", () => {
            service.dealCards({ playerId: "p6", handSize: 5, round: 1 });
            const deckBefore = getGameState("p6")!.deck.length;

            const result = service.dealCards({ playerId: "p6", handSize: 0, round: 2 });

            expect(result.hand).toHaveLength(0);
            expect(result.remainingDeckCount).toBe(deckBefore);
        });
    });
});
