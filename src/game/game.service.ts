import { Injectable, Logger } from "@nestjs/common";
import { PokerService } from "../poker/poker.service";

@Injectable()
export class GameService {
    private readonly logger = new Logger(GameService.name);

    constructor(private readonly pokerService: PokerService) {}

    playCard(cards: string[]): number {
        const handType = this.pokerService.getCardType(cards);
        return handType;
    }

    dealCards(data: { handSize: number; round: number; playerId: string }): object {
        const dealResult = this.pokerService.dealCards(data);
        return dealResult;
    }
}
