import { Card } from "../poker/poker.types";
import { BlindType } from "./blind.config";
import { TagCode } from "./tag.config";
export type GameStatus = "initialized" | "playing" | "finished";
export type SkippableBlindType = "small" | "big";

export type GameState = {
    playerId: string;

    playerState: PlayerState;
    blindState: BlindState;

    gameStatus: GameStatus;
};

export type PlayerState = {
    deck: Card[]; // remain deck
    hand: string[]; // current hand

    playsLeft: number; // Remaining card plays (default: 5)
    discardsLeft: number; // Remaining card abandonment times (default: 3)

    handSize: number;
    currentActionScore: number;

    money: number;
};

export type BlindState = {
    round: number; // Which move is it currently
    ante: number; // The current ante for the round, which increases as the rounds progress.

    blindType: BlindType; // The type of blind for the current round, which can be "small", "big", or "boss". Each type corresponds to a different score value that contributes to the player's total score.

    targetScore: number; // The score that the player needs to reach to win, default is 300, can be customized for different difficulty levels.
    currentBlindScore: number;

    currentAnteConfig: AnteConfig;
    nextAnteConfig?: AnteConfig;
};

export type GameStateResponse = {
    hand: string[];

    playsLeft: number;
    discardsLeft: number;

    remainingDeckCount: number;

    money: number;

    currentBlindScore: number;
    currentActionScore: number;

    gameStatus: GameStatus;

    targetScore: number;
};

export type GameActionResult = {
    code: number;
    message: string;

    action?: "play" | "discard" | "skipBlind";

    scoreDetail?: {
        selectedCards: string[];
        cardType: number;
        validCards: string[];
        baseScore: number;
        multiplier: number;
    };

    blindState?: {
        round: number;
        ante: number;
        blindType: BlindType;
        targetScore: number;
        currentBlindScore: number;
    };

    playerState?: GameStateResponse;

    progress?: Progress;
};

/**
 * Represents progression-related game information.
 *
 * Includes:
 * - blind completion
 * - settlement result
 * - next blind preview
 * - next ante preview
 */
export type Progress = {
    gameOver: boolean;
    blindOver: boolean;
    settlement?: {
        finalScore: number;
        targetScore: number;
        result: "WIN" | "LOSE";
        reward?: RewardMoneyDetail;
    };

    currentAnteConfig: AnteConfig;
    nextAnteConfig?: AnteConfig;

    // Preview data for the upcoming Blind.
    // Used by the frontend for stage transition display.
    nextBlindConfig?: NextBlindConfig;
};

export type RewardMoneyDetail = {
    baseMoney: number;
    remainingHandBonusMoney: number;
    interestMoney: number;
    currentBlindRewardMoney: number;
    moneyAfterReward: number;
};

export type NextBlindConfig = {
    ante: number;
    blindType: BlindType;
    score: number;
    boss?: {
        code: number;
        name: string;
    };
};

export type DealResult = {
    code: number;
    message: string;

    playerState?: {
        hand: string[];
        remainingDeckCount: number;
        playsLeft: number;
        discardsLeft: number;
        money: number
    };

    blindState?: {
        round: number;
        ante: number;
        blindType: BlindType;
        targetScore: number;
        currentAnteConfig: AnteConfig;
    };
};

export type AnteConfig = {
    ante: number;
    small: {
        score: number;
        tagCode: TagCode;
        baseRewardMoney: number;
    };
    big: {
        score: number;
        tagCode: TagCode;
        baseRewardMoney: number;
    };
    boss: {
        score: number;
        code: number;
        name: string;
        baseRewardMoney: number;
    };
};

export type PlayerActiveTag = {
    code: TagCode;
    status: "pending" | "applied";
};
