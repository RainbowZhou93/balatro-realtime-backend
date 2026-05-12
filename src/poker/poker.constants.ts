import { HandType } from "./poker.types";

export const CARD_TYPE: Record<HandType, number> = {
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

export const RANK_MAP: Record<string, number> = {
    A: 14,
    K: 13,
    Q: 12,
    J: 11,
};

export const NUMBER_TO_RANK_MAP: Record<number, string> = {
    14: "A",
    13: "K",
    12: "Q",
    11: "J",
};

export const SUITS = ["H", "S", "D", "C"] as const;

export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

export const CARD_PATTERN = /^(A|K|Q|J|10|[2-9])[HSDC]$/;

export const CARD_SCORE_MAP: Record<HandType, number> = {
    straightFlush: 100,
    fourOfAKind: 60,
    fullHouse: 40,
    flush: 35,
    straight: 30,
    threeOfAKind: 30,
    twoPair: 20,
    onePair: 10,
    highCard: 5,
};

export const CARD_MULTIPLIER_MAP: Record<HandType, number> = {
    straightFlush: 8,
    fourOfAKind: 7,
    fullHouse: 4,
    flush: 4,
    straight: 4,
    threeOfAKind: 3,
    twoPair: 2,
    onePair: 2,
    highCard: 1,
};

export const TYPE_CARD: Record<number, HandType> = {
    9: "straightFlush",
    8: "fourOfAKind",
    7: "fullHouse",
    6: "flush",
    5: "straight",
    4: "threeOfAKind",
    3: "twoPair",
    2: "onePair",
    1: "highCard",
};

export const CARD_SCORE: Record<number, number> = {
    14: 11,
    13: 10,
    12: 10,
    11: 10,
};
