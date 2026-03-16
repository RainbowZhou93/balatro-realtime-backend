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

    @SubscribeMessage("message")
    handleMessage(@MessageBody() data: string, @ConnectedSocket() client: GatewayClient): string {
        this.logger.log(`Received message from client ${client.__clientId}: ${data}`);
        return data;
    }

    @SubscribeMessage("handEvaluator")
    handleHandEvaluator(@MessageBody() data: string[], @ConnectedSocket() client: GatewayClient): number {
        const handType = this.gameService.playCard(data);
        this.logger.log(`Received hand evaluation request from client ${client.__clientId}: ${JSON.stringify(data)}`);
        return handType;
    }
}
