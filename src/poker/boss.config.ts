export const BOSS_BLIND_CODE = {
    THE_CLUB: 101,
    THE_DIAMOND: 102,
    THE_HEART: 103,
    THE_SPADE: 104,
    THE_STRAIGHT_FLUSH: 105,
    THE_FOUR_OF_A_KIND: 106,
    THE_FULL_HOUSE: 107,
    THE_FLUSH: 108,
    THE_STRAIGHT: 109,
    THE_THREE_OF_A_KIND: 110,
    THE_TWO_PAIR: 111,
    THE_ONE_PAIR: 112,
    THE_HIGH_CARD: 113,
};

export const BOSS_BLIND_CONFIG = {
    [BOSS_BLIND_CODE.THE_CLUB]: {
        code: BOSS_BLIND_CODE.THE_CLUB,
        name: "The Club",
        effect: { type: "disableSuit", suit: "C" },
    },
    [BOSS_BLIND_CODE.THE_DIAMOND]: {
        code: BOSS_BLIND_CODE.THE_DIAMOND,
        name: "The Diamond",
        effect: { type: "disableSuit", suit: "D" },
    },
    [BOSS_BLIND_CODE.THE_HEART]: {
        code: BOSS_BLIND_CODE.THE_HEART,
        name: "The Heart",
        effect: { type: "disableSuit", suit: "H" },
    },
    [BOSS_BLIND_CODE.THE_SPADE]: {
        code: BOSS_BLIND_CODE.THE_SPADE,
        name: "The Spade",
        effect: { type: "disableSuit", suit: "S" },
    },
    [BOSS_BLIND_CODE.THE_STRAIGHT_FLUSH]: {
        code: BOSS_BLIND_CODE.THE_STRAIGHT_FLUSH,
        name: "The Straight Flush",
        effect: { type: "disableHandType", handType: "straightFlush" },
    },
    [BOSS_BLIND_CODE.THE_FOUR_OF_A_KIND]: {
        code: BOSS_BLIND_CODE.THE_FOUR_OF_A_KIND,
        name: "The Four of a Kind",
        effect: { type: "disableHandType", handType: "fourOfAKind" },
    },
    [BOSS_BLIND_CODE.THE_FULL_HOUSE]: {
        code: BOSS_BLIND_CODE.THE_FULL_HOUSE,
        name: "The Full House",
        effect: { type: "disableHandType", handType: "fullHouse" },
    },
    [BOSS_BLIND_CODE.THE_FLUSH]: {
        code: BOSS_BLIND_CODE.THE_FLUSH,
        name: "The Flush",
        effect: { type: "disableHandType", handType: "flush" },
    },
    [BOSS_BLIND_CODE.THE_STRAIGHT]: {
        code: BOSS_BLIND_CODE.THE_STRAIGHT,
        name: "The Straight",
        effect: { type: "disableHandType", handType: "straight" },
    },
    [BOSS_BLIND_CODE.THE_THREE_OF_A_KIND]: {
        code: BOSS_BLIND_CODE.THE_THREE_OF_A_KIND,
        name: "The Three of a Kind",
        effect: { type: "disableHandType", handType: "threeOfAKind" },
    },
    [BOSS_BLIND_CODE.THE_TWO_PAIR]: {
        code: BOSS_BLIND_CODE.THE_TWO_PAIR,
        name: "The Two Pair",
        effect: { type: "disableHandType", handType: "twoPair" },
    },
    [BOSS_BLIND_CODE.THE_ONE_PAIR]: {
        code: BOSS_BLIND_CODE.THE_ONE_PAIR,
        name: "The One Pair",
        effect: { type: "disableHandType", handType: "onePair" },
    },
    [BOSS_BLIND_CODE.THE_HIGH_CARD]: {
        code: BOSS_BLIND_CODE.THE_HIGH_CARD,
        name: "The High Card",
        effect: { type: "disableHandType", handType: "highCard" },
    },
};

export type BossBlindCode = (typeof BOSS_BLIND_CODE)[keyof typeof BOSS_BLIND_CODE];
