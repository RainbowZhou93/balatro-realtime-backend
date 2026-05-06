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

type DealResult = {
    hand: string[];
    remainingDeckCount: number;
    playsLeft: number;
};

type DealCardsInput = {
    playerId: string;
    handSize: number;
    round: number;
};

type GameState = {
    playerId: string;

    deck: Card[]; // remain deck
    hand: string[]; // current hand

    playsLeft: number; // Remaining card plays (default: 5)
    discardsLeft: number; // Remaining card abandonment times (default: 3)

    round: number; // Which move is it currently

    score: number;
};

interface Card {
    rank: number;
    suit: Suit;
}

export type { Suit, HandType, Card, DealResult, DealCardsInput, GameState };
