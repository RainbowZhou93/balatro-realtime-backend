export const TAG_CODE = {
    BOSS_TAG: 201,
    JUGGLE_TAG: 202,
} as const;

export const TAG_CONFIG = {
    [TAG_CODE.BOSS_TAG]: {
        code: TAG_CODE.BOSS_TAG,
        name: "Boss Tag",
        description: "Rerolls the next Boss Blind",
    },
    [TAG_CODE.JUGGLE_TAG]: {
        code: TAG_CODE.JUGGLE_TAG,
        name: "Juggle Tag",
        description: "+3 Hand Size for the next round only",
    },
} as const;

export type TagCode = (typeof TAG_CODE)[keyof typeof TAG_CODE];
