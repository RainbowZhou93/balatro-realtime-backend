import { getCardType } from "../src/games/hand/handEvaluator";

describe("Poker Hand Type Test", () => {

    test("Royal Flush", () => {
        const result = getCardType(['QH', '10H', 'AH', 'JH', 'KH']);
        expect(result).toBe(10);
    });

    test("Straight Flush", () => {
        const result = getCardType(['9S', '6S', '10S', '7S', '8S']);
        expect(result).toBe(9);
    });

    test("Four of a kind", () => {
        const result = getCardType(['9C', '9H', '9D', '9S']);
        expect(result).toBe(8);
    });

    test("Full House", () => {
        const result = getCardType(['6H', '3D', '3H', '6C', '3S']);
        expect(result).toBe(7);
    });

    test("Flush", () => {
        const result = getCardType(['KH', '2H', '9H', '5H', '7H']);
        expect(result).toBe(6);
    });

    test("Straight", () => {
        const result = getCardType(['7C', '4H', '8H', '6D', '5S']);
        expect(result).toBe(5);
    });

    test("Straight A2345", () => {
        const result = getCardType(['3D', 'AH', '5H', '2S', '4C']);
        expect(result).toBe(5);
    });

    test("Three of a kind", () => {
        const result = getCardType(['KH', '7D', '9H', '7H', '7S']);
        expect(result).toBe(4);
    });

    test("Two Pair", () => {
        const result = getCardType(['9C', '5H', '9D', '5S']);
        expect(result).toBe(3);
    });

    test("One Pair", () => {
        const result = getCardType(['2D', 'KH', '8H', '5C', '8S']);
        expect(result).toBe(2);
    });

    test("High Card", () => {
        const result = getCardType(['JC', '2H', 'KH', '9D', '5S']);
        expect(result).toBe(1);
    });

    test("Invalid card", () => {
        expect(() => {
            getCardType(['9D', 'KH', 'XX', '5S', 'JC']);
        }).toThrow();
    });

});