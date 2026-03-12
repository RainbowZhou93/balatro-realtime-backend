
/**
 * 输入最多5张牌，根据牌的点数和花色，判断是否是皇家同花顺，同花顺、四条、葫芦、同花、顺子、三条、两对、一对、高牌、杂牌等牌型。
 * 牌的点数从2到10，J、Q、K、A分别对应11、12、13、14。
 * 花色有四种：红桃（H）、黑桃（S）、方块（D）、梅花（C）。
 * 输出牌型的名称，例如：皇家同花顺royalFlush，同花顺straightFlush、四条fourOfAKind、葫芦fullHouse、同花flush、顺子straight、三条threeOfAKind、两对twoPair、一对onePair、高牌highCard、杂牌junk。
 * 
 * 输入格式：
 * 输入最多5张牌，牌的格式为点数加花色，例如：10H、JD、QS、KC、AD。
 * 输入结束后，输出对应的牌型名称。
 * 
 * 示例输入：
 * 10H JD QS KC AD
 * 2H 3D 4S 5C 6H
 * 2H 2D 2S 5C 6H  
 * 
 * 示例输出：
 * 10
 */

type Suit = 'H' | 'S' | 'D' | 'C';
type HandType = 'royalFlush' | 'straightFlush' | 'fourOfAKind' | 'fullHouse' | 'flush' | 'straight' | 'threeOfAKind' | 'twoPair' | 'onePair' | 'highCard';

type Card = {
    rank: number,
    suit: Suit
}


const cardType: Record<HandType, number> = {
    royalFlush: 10,
    straightFlush: 9,
    fourOfAKind: 8,
    fullHouse: 7,
    flush: 6,
    straight: 5,
    threeOfAKind: 4,
    twoPair: 3,
    onePair: 2,
    highCard: 1,
}

const rankMap: Record<string, number> = {
    A: 14,
    K: 13,
    Q: 12,
    J: 11
}

function getCardType(cards: string[]): number {
    const userCard = parseCard(cards)
    const suitCount = Object.values(checkSuitCount(userCard));
    const isFlush = suitCount.includes(5);
    const sortedRanks = userCard.map(card => card.rank).sort((a, b) => a - b);
    let isStraight = false;

    if (userCard.length === 5) {
        isStraight = true;
        const uniqueRanks = new Set(sortedRanks);
        if (uniqueRanks.size !== 5) {
            isStraight = false;
        } else {
            for (let i = 1; i < sortedRanks.length; i++) {
                // 这里使用非空断言，是因为当前循环边界已经保证 sortedRanks[i] 与 sortedRanks[i - 1] 一定存在。
                if (sortedRanks[i]! - 1 != sortedRanks[i - 1]!) {
                    isStraight = false;
                    break;
                }
            }
            // sortedRanks.join() 判断sortedRanks中的元素是否是2、3、4、5、14（A）。如果是的话，说明这是一个特殊的顺子，A在这里被当作1来使用。
            if (sortedRanks.join() === "2,3,4,5,14") isStraight = true;
        }


    }

    const rankCount = checkRankCount(userCard);
    const rankCounts = Object.values(rankCount);
    if (isStraight && isFlush && sortedRanks[0] === 10) return cardType.royalFlush;
    if (isStraight && isFlush) return cardType.straightFlush;
    if (rankCounts.includes(4)) return cardType.fourOfAKind;
    if (rankCounts.includes(3) && rankCounts.includes(2)) return cardType.fullHouse;
    if (isFlush) return cardType.flush;
    if (isStraight) return cardType.straight;
    if (rankCounts.includes(3)) return cardType.threeOfAKind;
    /**
     * count => count === 2 是一个回调函数，判断每个元素是否等于2。filter方法会返回一个新数组，包含所有满足条件的元素。
     * 例如，如果rankCounts是[1, 2, 2, 1]，那么rankCounts.filter(count => count === 2)会返回[2, 2]，因为有两个元素等于2。
     * 然后我们检查这个新数组的长度是否等于2，如果是的话，说明我们有两对牌。
     */
    if (rankCounts.filter(count => count === 2).length === 2) return cardType.twoPair;
    if (rankCounts.includes(2)) return cardType.onePair;

    return cardType.highCard;
}

/**
 * 
 * @param cards ['10H', 'JD', 'KS', '9C']
 * @returns: [{rank:10,suit:'H'},{rank:11,suit:'D'},{rank:12,suit:'S'},{rank:13,suit:'C'},{rank:14,suit:'D'}]
 */
function parseCard(cards: string[]): Card[] {
    const validSuits: Set<Suit> = new Set(['H', 'S', 'D', 'C']);

    return cards.map((card) => {
        const suit = card.slice(-1);
        const rankStr = card.slice(0, -1) || "0";
        const rank = rankMap[rankStr] ?? Number(rankStr);
        //这里使用 as Suit 进行类型断言，用于通过 Set<Suit> 的类型检查。这类断言只影响 TypeScript 编译期，不会在运行时做额外校验。
        if (!validSuits.has(suit as Suit) || Number.isNaN(rank)) {
            throw new Error(`Invalid card format rank: ${card}`);
        }
        return { rank, suit: suit as Suit }
    });
}

/**
 * 
 * @param cards: [{rank:10,suit:'H'},{rank:11,suit:'D'},{rank:12,suit:'S'},{rank:13,suit:'C'},{rank:14,suit:'D'}]
 * @returns: { '3': 1, '5': 1, '8': 1, '10': 1, '11': 1 }
 */
function checkRankCount(cards: Card[]): Record<number, number> {
    const rankCount: Record<number, number> = {};
    for (let card of cards) {
        rankCount[card.rank] = (rankCount[card.rank] || 0) + 1;
    }
    return rankCount;
}

/**
 * 
 * @param cards [{rank:10,suit:'H'},{rank:11,suit:'D'},{rank:12,suit:'S'},{rank:13,suit:'C'},{rank:14,suit:'D'}]
 * @returns: { H: 1, S: 1, D: 2, C: 1 }
 */
function checkSuitCount(cards: Card[]): Record<Suit, number> {
    const suitCount: Record<Suit, number> = { H: 0, S: 0, D: 0, C: 0 };
    for (let card of cards) {
        suitCount[card.suit]++;
    }
    return suitCount;
}

// console.log(getCardType(['10H', 'JD', 'QS', 'KC', 'AD']));
export { getCardType }