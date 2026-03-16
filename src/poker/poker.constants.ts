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

export { CARD_TYPE, RANK_MAP };
