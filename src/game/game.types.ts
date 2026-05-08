import { Card } from "../poker/poker.types";

export type GameState = {
    playerId: string;

    deck: Card[]; // remain deck
    hand: string[]; // current hand

    playsLeft: number; // Remaining card plays (default: 5)
    discardsLeft: number; // Remaining card abandonment times (default: 3)
    handSize: number;

    round: number; // Which move is it currently

    score: number;
};

export type PlayCardsResult = {
    code: number;
    hand: string[];
    playsLeft: number;
    discardsLeft: number;
    remainingDeckCount: number;
    selectedCards: string[];
    gameOver: boolean;
};

export type DealResult = {
    hand: string[];
    remainingDeckCount: number;
    playsLeft: number;
};
