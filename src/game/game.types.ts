import { Card } from "../poker/poker.types";
import { BlindType } from "./blind.config";

export type GameState = {
    playerId: string;

    playerState: PlayerState;
    blindState: BlindState;

    gameStatus: "playing" | "finished";
};

export type PlayerState = {
    deck: Card[]; // remain deck
    hand: string[]; // current hand

    playsLeft: number; // Remaining card plays (default: 5)
    discardsLeft: number; // Remaining card abandonment times (default: 3)

    handSize: number;
    currentActionScore: number;
};

export type BlindState = {
    round: number; // Which move is it currently
    ante: number; // The current ante for the round, which increases as the rounds progress.

    blindType: BlindType; // The type of blind for the current round, which can be "small", "big", or "boss". Each type corresponds to a different score value that contributes to the player's total score.

    targetScore: number; // The score that the player needs to reach to win, default is 300, can be customized for different difficulty levels.
    currentBlindScore: number;
};

export type GameStateResponse = {
    hand: string[];

    playsLeft: number;
    discardsLeft: number;

    remainingDeckCount: number;

    currentBlindScore: number;
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
