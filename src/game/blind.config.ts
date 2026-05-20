export type BlindType = "small" | "big" | "boss";

export const BLIND_SCORE_CONFIG = {
    1: [
        { type: "small", score: 150 },
        { type: "big", score: 250 },
        { type: "boss", score: 350 },
    ],
    2: [
        { type: "small", score: 200 },
        { type: "big", score: 300 },
        { type: "boss", score: 400 },
    ],
    3: [
        { type: "small", score: 250 },
        { type: "big", score: 350 },
        { type: "boss", score: 450 },
    ],
    4: [
        { type: "small", score: 300 },
        { type: "big", score: 400 },
        { type: "boss", score: 500 },
    ],
    5: [
        { type: "small", score: 350 },
        { type: "big", score: 450 },
        { type: "boss", score: 550 },
    ],
    6: [
        { type: "small", score: 400 },
        { type: "big", score: 500 },
        { type: "boss", score: 600 },
    ],
    7: [
        { type: "small", score: 450 },
        { type: "big", score: 550 },
        { type: "boss", score: 650 },
    ],
    8: [
        { type: "small", score: 500 },
        { type: "big", score: 600 },
        { type: "boss", score: 700 },
    ],
} as const;
