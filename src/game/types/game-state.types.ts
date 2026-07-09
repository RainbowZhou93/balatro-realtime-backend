import { Card } from "../../poker/poker.types";
import { BlindType, TagCode } from "../configs";
import { GameStatus } from "../constants";
import { RewardMoneyDetail } from "./game-economy.types";
import { ShopState } from "./shop.types";

export type SkippableBlindType = "small" | "big";
export type ActionType = "play" | "discard";
export type PlayResult = "win" | "lose";

export type GameState = {
    playerId: string;
    playerState: PlayerState;
    blindState: BlindState;
    gameStatus: GameStatus;
    shopState?: ShopState;
};

export type PlayerState = {
    deck: Card[];
    hand: string[];

    playsLeft: number;
    discardsLeft: number;

    handSize: number;
    currentActionScore: number;

    money: number;

    jokers: PlayerJoker[];
};

export type BlindState = {
    round: number;
    ante: number;
    blindType: BlindType;
    targetScore: number;
    currentBlindScore: number;
    currentAnteConfig: AnteConfig;
    nextAnteConfig?: AnteConfig;
};

export type PlayerActiveTag = {
    code: TagCode;
    status: "pending" | "applied";
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

export type NextBlindConfig = {
    ante: number;
    blindType: BlindType;
    score: number;
    boss?: {
        code: number;
        name: string;
    };
};

export type Progress = {
    gameOver: boolean;
    blindOver: boolean;
    settlement?: {
        finalScore: number;
        targetScore: number;
        result: PlayResult;
        reward?: RewardMoneyDetail;
    };

    currentAnteConfig: AnteConfig;
    nextAnteConfig?: AnteConfig;

    // Preview data for the upcoming Blind.
    // Used by the frontend for stage transition display.
    nextBlindConfig?: NextBlindConfig;
};

export type PlayerJoker = {
    instanceId: string;
    configId: number;
    name: string;
    description: string;
    runtimeState: Record<string, number | string | boolean>;
};
