type Suit = "H" | "S" | "D" | "C";
type HandType =
    | "royalFlush"
    | "straightFlush"
    | "fourOfAKind"
    | "fullHouse"
    | "flush"
    | "straight"
    | "threeOfAKind"
    | "twoPair"
    | "onePair"
    | "highCard";

interface Card {
    rank: number;
    suit: Suit;
}

export type { Suit, HandType, Card };
