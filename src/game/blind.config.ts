export type BlindType = "small" | "big" | "boss";

export const BLIND_SCORE_CONFIG = {
    1: [
        { type: "small", score: 150, baseRewardMoney: 3 },
        { type: "big", score: 250, baseRewardMoney: 4 },
        { type: "boss", score: 350, baseRewardMoney: 5 },
    ],
    2: [
        { type: "small", score: 200, baseRewardMoney: 3 },
        { type: "big", score: 300, baseRewardMoney: 4 },
        { type: "boss", score: 400, baseRewardMoney: 5 },
    ],
    3: [
        { type: "small", score: 250, baseRewardMoney: 3 },
        { type: "big", score: 350, baseRewardMoney: 4 },
        { type: "boss", score: 450, baseRewardMoney: 5 },
    ],
    4: [
        { type: "small", score: 300, baseRewardMoney: 3 },
        { type: "big", score: 400, baseRewardMoney: 4 },
        { type: "boss", score: 500, baseRewardMoney: 5 },
    ],
    5: [
        { type: "small", score: 350, baseRewardMoney: 3 },
        { type: "big", score: 450, baseRewardMoney: 4 },
        { type: "boss", score: 550, baseRewardMoney: 5 },
    ],
    6: [
        { type: "small", score: 400, baseRewardMoney: 3 },
        { type: "big", score: 500, baseRewardMoney: 4 },
        { type: "boss", score: 600, baseRewardMoney: 5 },
    ],
    7: [
        { type: "small", score: 450, baseRewardMoney: 3 },
        { type: "big", score: 550, baseRewardMoney: 4 },
        { type: "boss", score: 650, baseRewardMoney: 5 },
    ],
    8: [
        { type: "small", score: 500, baseRewardMoney: 3 },
        { type: "big", score: 600, baseRewardMoney: 4 },
        { type: "boss", score: 700, baseRewardMoney: 5 },
    ],
} as const;

export const TOTAL_ANTE_COUNT = Object.keys(BLIND_SCORE_CONFIG).length;
