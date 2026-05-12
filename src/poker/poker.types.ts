export type Suit = "H" | "S" | "D" | "C";
export type HandType =
    | "straightFlush"
    | "fourOfAKind"
    | "fullHouse"
    | "flush"
    | "straight"
    | "threeOfAKind"
    | "twoPair"
    | "onePair"
    | "highCard";

export interface Card {
    rank: number;
    suit: Suit;
}

export interface HandEvaluateResult {
    cardType: number;
    validCards: Card[];
}
