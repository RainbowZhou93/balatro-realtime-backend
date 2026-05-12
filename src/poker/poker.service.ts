import { Injectable } from "@nestjs/common";
import { Card, Suit } from "./poker.types";
import { RANK_MAP, CARD_TYPE, SUITS, RANKS, NUMBER_TO_RANK_MAP, CARD_PATTERN } from "./poker.constants";

@Injectable()
export class PokerService {
    private readonly baseDeck: ReadonlyArray<Card>;

    constructor() {
        this.baseDeck = this.createDeck();
    }
    public getCardType(cards: string[]): number {
        const userCard = this.parseCard(cards);
        const suitCount = Object.values(this.checkSuitCount(userCard));
        const isFlush = suitCount.includes(5);
        const sortedRanks = userCard.map((card) => card.rank).sort((a, b) => a - b);
        let isStraight = false;

        if (userCard.length === 5) {
            isStraight = true;
            const uniqueRanks = new Set(sortedRanks);
            if (uniqueRanks.size !== 5) {
                isStraight = false;
            } else {
                for (let i = 1; i < sortedRanks.length; i++) {
                    if (sortedRanks[i] - 1 != sortedRanks[i - 1]) {
                        isStraight = false;
                        break;
                    }
                }

                // A can be used as 1 in A-2-3-4-5 straight.
                if (sortedRanks.join() === "2,3,4,5,14") isStraight = true;
            }
        }

        const rankCount = this.checkRankCount(userCard);
        const rankCounts = Object.values(rankCount);
        if (isStraight && isFlush && sortedRanks[0] === 10) return CARD_TYPE.royalFlush;
        if (isStraight && isFlush) return CARD_TYPE.straightFlush;
        if (rankCounts.includes(4)) return CARD_TYPE.fourOfAKind;
        if (rankCounts.includes(3) && rankCounts.includes(2)) return CARD_TYPE.fullHouse;
        if (isFlush) return CARD_TYPE.flush;
        if (isStraight) return CARD_TYPE.straight;
        if (rankCounts.includes(3)) return CARD_TYPE.threeOfAKind;
        /**
         * count => count === 2 是一个回调函数，判断每个元素是否等于2。filter方法会返回一个新数组，包含所有满足条件的元素。
         * 例如，如果rankCounts是[1, 2, 2, 1]，那么rankCounts.filter(count => count === 2)会返回[2, 2]，因为有两个元素等于2。
         * 然后我们检查这个新数组的长度是否等于2，如果是的话，说明我们有两对牌。
         */
        if (rankCounts.filter((count) => count === 2).length === 2) return CARD_TYPE.twoPair;
        if (rankCounts.includes(2)) return CARD_TYPE.onePair;

        return CARD_TYPE.highCard;
    }

    /**
     * @param cards ["10H", "JD", "KS", "9C"]
     * @returns: [{rank:10,suit:"H"},{rank:11,suit:"D"},{rank:12,suit:"S"},{rank:13,suit:"C"},{rank:14,suit:"D"}]
     */
    private parseCard(cards: string[]): Card[] {
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

    public getBaseDeck(): Card[] {
        return [...this.baseDeck];
    }

    public shuffleDeck(deck: Card[]): Card[] {
        for (let i = deck.length - 1; i > 0; i--) {
            const randomNum = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[randomNum]] = [deck[randomNum], deck[i]];
        }
        return deck;
    }

    public serializeCards(cards: Card[]): string[] {
        return cards.map((card) => {
            const rank = NUMBER_TO_RANK_MAP[card.rank] ?? card.rank;
            return `${rank}${card.suit}`;
        });
    }
}
