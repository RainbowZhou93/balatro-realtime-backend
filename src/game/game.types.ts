import { Card } from "../poker/poker.types";

export type GameState = {
    playerId: string;

    deck: Card[]; // remain deck
    hand: string[]; // current hand

    playsLeft: number; // Remaining card plays (default: 5)
    discardsLeft: number; // Remaining card abandonment times (default: 3)
    handSize: number;

    round: number; // Which move is it currently

    totalScore: number;
    targetScore: number; // The score that the player needs to reach to win, default is 300, can be customized for different difficulty levels.
    currentActionScore: number;

    gameStatus: "playing" | "finished";
};

export type GameStateResponse = {
    hand: string[];

    playsLeft: number;
    discardsLeft: number;

    remainingDeckCount: number;

    totalScore: number;
    currentActionScore: number;

    gameStatus: "playing" | "finished";

    targetScore: number;
};

export type SelectCardsResult = {
    code: number;
    selectedCards: string[];
    gameOver?: boolean;
    remainingDeckCount?: number;
    playerState?: GameStateResponse;
    cardType?: number;
    validCards?: string[];
    baseScore?: number;
    multiplier?: number;
    settlement?: {
        finalScore: number;
        targetScore: number;
        result: string;
    };
};

export type DealResult = {
    code: number;
    hand?: string[];
    remainingDeckCount?: number;
    playsLeft?: number;
    discardsLeft?: number;
};
