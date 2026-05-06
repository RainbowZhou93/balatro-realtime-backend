import { HandType } from "./poker.types";

const CARD_TYPE: Record<HandType, number> = {
    royalFlush: 10,
    straightFlush: 9,
    fourOfAKind: 8,
    fullHouse: 7,
    flush: 6,
    straight: 5,
    threeOfAKind: 4,
    twoPair: 3,
    onePair: 2,
    highCard: 1,
};

const RANK_MAP: Record<string, number> = {
    A: 14,
    K: 13,
    Q: 12,
    J: 11,
};

const NUMBER_TO_RANK_MAP: Record<number, string> = {
    14: "A",
    13: "K",
    12: "Q",
    11: "J",
};

const SUITS = ["H", "S", "D", "C"] as const;

const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

export { CARD_TYPE, RANK_MAP, NUMBER_TO_RANK_MAP, SUITS, RANKS };
