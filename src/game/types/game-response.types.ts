import { GameStatus } from "../constants";
import { BlindType } from "../blind.config";

export type PlayerStateResponse = {
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

export type BlindStateResponse = {
    round: number;
    ante: number;
    blindType: BlindType;
    targetScore: number;
    currentBlindScore: number;
};

export type GameStateResponse = {
    blindState?: BlindStateResponse;
    playerState?: PlayerStateResponse;
    shopState?: unknown[];
    gameStatus: GameStatus;
};