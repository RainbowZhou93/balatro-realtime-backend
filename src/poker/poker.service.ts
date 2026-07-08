import { Injectable } from "@nestjs/common";
import { Card, Suit, HandEvaluateResult } from "./poker.types";
import {
    RANK_MAP,
    CARD_TYPE,
    TYPE_CARD,
    SUITS,
    RANKS,
    NUMBER_TO_RANK_MAP,
    CARD_PATTERN,
    CARD_SCORE_MAP,
    CARD_MULTIPLIER_MAP,
    CARD_SCORE,
} from "./poker.constants";

import { BOSS_BLIND_CONFIG, BossEffect } from "../game/configs";
@Injectable()
export class PokerService {
    private readonly baseDeck: ReadonlyArray<Card>;

    constructor() {
        this.baseDeck = this.createDeck();
    }

    public getCardType(cards: string[]): HandEvaluateResult {
        const userCard = this.parseCard(cards);

        const suitCount = Object.values(this.checkSuitCount(userCard));
        const isFlush = userCard.length === 5 && suitCount.includes(5);

        const sortedRanks = userCard.map((card) => card.rank).sort((a, b) => a - b);

        let isStraight = false;

        if (userCard.length === 5) {
            const uniqueRanks = new Set(sortedRanks);

            if (uniqueRanks.size === 5) {
                isStraight = true;

                for (let i = 1; i < sortedRanks.length; i++) {
                    if (sortedRanks[i] - 1 !== sortedRanks[i - 1]) {
                        isStraight = false;
                        break;
                    }
                }

                // A can be used as 1 in A-2-3-4-5 straight.
                if (sortedRanks.join() === "2,3,4,5,14") {
                    isStraight = true;
                }
            }
        }

        const rankCount = this.checkRankCount(userCard);
        const rankCounts = Object.values(rankCount);

        if (isStraight && isFlush) return { cardType: CARD_TYPE.straightFlush, validCards: userCard };

        if (rankCounts.includes(4)) {
            const fourRank = Number(Object.keys(rankCount).find((rank) => rankCount[rank] === 4));
            return { cardType: CARD_TYPE.fourOfAKind, validCards: this.getCardsByRank(userCard, fourRank) };
        }

        if (rankCounts.includes(3) && rankCounts.includes(2))
            return { cardType: CARD_TYPE.fullHouse, validCards: userCard };

        if (isFlush) return { cardType: CARD_TYPE.flush, validCards: userCard };

        if (isStraight) return { cardType: CARD_TYPE.straight, validCards: userCard };

        if (rankCounts.includes(3)) {
            const threeRank = Number(Object.keys(rankCount).find((rank) => rankCount[rank] === 3));
            return { cardType: CARD_TYPE.threeOfAKind, validCards: this.getCardsByRank(userCard, threeRank) };
        }

        if (rankCounts.filter((count) => count === 2).length === 2) {
            // Sort descending so the higher pair appears first in validCards.
            const pairRanks = Object.entries(rankCount)
                .filter(([, count]) => count === 2)
                .map(([rank]) => Number(rank))
                .sort((a, b) => b - a);

            return { cardType: CARD_TYPE.twoPair, validCards: this.getCardsByRanks(userCard, pairRanks) };
        }

        if (rankCounts.includes(2)) {
            const pairRank = Number(Object.keys(rankCount).find((rank) => rankCount[rank] === 2));
            return { cardType: CARD_TYPE.onePair, validCards: this.getCardsByRank(userCard, pairRank) };
        }

        const highestRank = Math.max(...userCard.map((card) => card.rank));
        const highestCard = userCard.find((card) => card.rank === highestRank)!;
        return { cardType: CARD_TYPE.highCard, validCards: [highestCard] };
    }

    public getBaseDeck(): Card[] {
        return [...this.baseDeck];
    }

    public calculateHandScore(
        cards: string[],
        bossCode: number,
    ): {
        baseScore: number;
        multiplier: number;
        handType: number;
        validCards: string[];
    } {
        const handEvaluate: HandEvaluateResult = this.getCardType(cards);
        const validCardsAfter = handEvaluate.validCards;
        // console.log(`---validCards: ${JSON.stringify(validCards)}------`);

        const effect: BossEffect | null = BOSS_BLIND_CONFIG[bossCode]?.effect as BossEffect | null;
        let scoringCards: Card[] = validCardsAfter;
        scoringCards = this.applyDisableSuitEffect(scoringCards, effect);

        let baseScore: number = 0;
        for (let i = 0; i < scoringCards.length; i++) {
            const card = scoringCards[i];
            baseScore += CARD_SCORE[card.rank] ?? card.rank;
        }
        // console.log(`befor baseScore: ${baseScore}`);
        const cardType: number = handEvaluate.cardType;
        const handType: string = TYPE_CARD[cardType];
        if (!handType) {
            throw new Error(`Unknown hand type: ${handEvaluate.cardType}`);
        }

        let multiplier: number = CARD_MULTIPLIER_MAP[handType];
        let validCards: string[] = this.serializeCards(scoringCards);
        baseScore += CARD_SCORE_MAP[handType];
        // console.log(`score: ${baseScore} * ${CARD_MULTIPLIER_MAP[handType]} = ${score}`);

        if (this.isHandTypeDisabled(cardType, effect)) {
            baseScore = 0;
            multiplier = 0;
            validCards = [];
        }

        return {
            baseScore,
            multiplier,
            handType: cardType,
            validCards,
        };
    }

    /**
     * @param cards ["10H", "JD", "KS", "9C"]
     * @returns: [{rank:10,suit:"H"},{rank:11,suit:"D"},{rank:12,suit:"S"},{rank:13,suit:"C"},{rank:14,suit:"D"}]
     */
    public parseCard(cards: string[]): Card[] {
        const validSuits: Set<Suit> = new Set(["H", "S", "D", "C"]);
        return cards.map((card) => {
            if (!CARD_PATTERN.test(card)) {
                throw new Error(`Invalid card format: ${card}`);
            }
            const suit = card.slice(-1);
            const rankStr = card.slice(0, -1) || "0";
            const rank = RANK_MAP[rankStr] ?? Number(rankStr);
            //这里使用 as Suit 进行类型断言，用于通过 Set<Suit> 的类型检查。这类断言只影响 TypeScript 编译期，不会在运行时做额外校验。
            if (!validSuits.has(suit as Suit) || Number.isNaN(rank)) {
                throw new Error(`Invalid card format rank: ${card}`);
            }
            return { rank, suit: suit as Suit };
        });
    }

    public getCardRank(card: string): number {
        return this.parseCard([card])[0].rank;
    }

    public serializeCards(cards: Card[]): string[] {
        return cards.map((card) => {
            const rank = NUMBER_TO_RANK_MAP[card.rank] ?? card.rank;
            return `${rank}${card.suit}`;
        });
    }

    /**
     * @param cards: [{rank:10,suit:"H"},{rank:11,suit:"D"},{rank:12,suit:"S"},{rank:13,suit:"C"},{rank:14,suit:"D"}]
     * @returns: { "3": 1, "5": 1, "8": 1, "10": 1, "11": 1 }
     */
    private checkRankCount(cards: Card[]): Record<number, number> {
        const rankCount: Record<number, number> = {};
        for (const card of cards) {
            rankCount[card.rank] = (rankCount[card.rank] || 0) + 1;
        }
        return rankCount;
    }

    /**
     * @param cards [{rank:10,suit:"H"},{rank:11,suit:"D"},{rank:12,suit:"S"},{rank:13,suit:"C"},{rank:14,suit:"D"}]
     * @returns: { H: 1, S: 1, D: 2, C: 1 }
     */
    private checkSuitCount(cards: Card[]): Record<Suit, number> {
        const suitCount: Record<Suit, number> = { H: 0, S: 0, D: 0, C: 0 };
        for (const card of cards) {
            suitCount[card.suit]++;
        }
        return suitCount;
    }

    private createDeck(): Card[] {
        const deck: Card[] = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                deck.push({ rank, suit });
            }
        }
        return deck;
    }

    private getCardsByRank(userCard: Card[], rank: number): Card[] {
        return userCard.filter((card) => card.rank === rank);
    }

    private getCardsByRanks(userCard: Card[], ranks: number[]): Card[] {
        return userCard.filter((card) => ranks.includes(card.rank));
    }

    private applyDisableSuitEffect(cards: Card[], effect: BossEffect | null): Card[] {
        if (effect?.type !== "disableSuit") return cards;

        return cards.filter((card) => card.suit !== effect.suit);
    }

    private isHandTypeDisabled(cardType: number, effect: BossEffect | null): boolean {
        return effect?.type === "disableHandType" && cardType === CARD_TYPE[effect.handType];
    }
}
