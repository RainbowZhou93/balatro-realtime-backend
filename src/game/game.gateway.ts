import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { GameService } from "./game.service";

type GatewayClient = WebSocket & {
    _socket?: {
        remoteAddress?: string;
        remotePort?: number;
    };
    __clientId?: string;
};

@WebSocketGateway()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(GameGateway.name);
    private clients = new Map<string, WebSocket>();
    private clientIdCounter = 1;

    constructor(private readonly gameService: GameService) {}

    handleConnection(@ConnectedSocket() client: GatewayClient) {
        const sock = client._socket;
        const ip = sock?.remoteAddress;
        const port = sock?.remotePort;
        const id = ip && port ? `${ip}:${port}` : `client_${this.clientIdCounter++}`;

        client.__clientId = id;
        this.clients.set(id, client);
        this.logger.log(`Client connected: ${ip}:${port}, assigned ID: ${id}`);
    }

    handleDisconnect(@ConnectedSocket() client: GatewayClient) {
        const id = client.__clientId;

        if (id) {
            this.clients.delete(id);
            this.logger.log(`Client disconnected: ${id}`);
        } else {
            this.logger.log(`Client disconnected: unknown client`);
        }
    }

    @SubscribeMessage("handEvaluator")
    handleHandEvaluator(@MessageBody() data: string[]): object {
        const handType = this.gameService.playCard(data);
        return { event: "handEvaluator", data: { handType } };
    }

    @SubscribeMessage("dealCards")
    handleDealCards(
        @MessageBody() data: { handSize: number; round: number },
        @ConnectedSocket() client: GatewayClient,
    ): object {
        const playerId = client.__clientId;
        if (!playerId) {
            return {
                event: "error",
                data: {
                    code: "PLAYER_ID_NOT_FOUND",
                    message: "Player id is required",
                },
            };
        }
        const msg = {
            handSize: data.handSize,
            round: data.round,
            playerId: playerId,
        };

        const dealResult = this.gameService.dealCards(msg);
        return { event: "dealCards", data: dealResult };
    }
}
