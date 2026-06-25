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
import { SkippableBlindType } from "./types";
import { GameSocketEvents, PLAYER_STATE_CODE } from "./constants";

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

    @SubscribeMessage("initGame")
    handleInitGame(@MessageBody() _data: object, @ConnectedSocket() client: GatewayClient): void {
        const playerId = client.__clientId;
        if (!playerId) {
            this.sendGameEvent(client, GameSocketEvents.Error, {
                code: PLAYER_STATE_CODE.NOT_FOUND,
                message: "Player id is required initGame.",
            });
            return;
        }
        const gameInfo = this.gameService.initGame(playerId);
        this.sendGameEvent(client, GameSocketEvents.InitGame, gameInfo);
    }

    @SubscribeMessage("startGame")
    handleStartGame(@MessageBody() _data: object, @ConnectedSocket() client: GatewayClient): void {
        const playerId = client.__clientId;
        if (!playerId) {
            this.sendGameEvent(client, GameSocketEvents.Error, {
                code: PLAYER_STATE_CODE.NOT_FOUND,
                message: "Player id is required startGame.",
            });
            return;
        }

        const dealResult = this.gameService.startGame(playerId);
        this.sendGameEvent(client, GameSocketEvents.StartGame, dealResult);
    }

    @SubscribeMessage("selectCards")
    handlePlayCards(
        @MessageBody() data: { selectedCards: string[]; action: "play" | "discard" },
        @ConnectedSocket() client: GatewayClient,
    ): void {
        const playerId = client.__clientId;
        if (!playerId) {
            this.sendGameEvent(client, GameSocketEvents.Error, {
                code: PLAYER_STATE_CODE.NOT_FOUND,
                message: "Player id is required selectCards.",
            });
            return;
        }
        // const selectCardsResult = this.gameService.selectCards(data.selectedCards, data.action, playerId);
        // return { event: "selectCardsResult", data: selectCardsResult };
    }

    @SubscribeMessage("skipBlind")
    handleSkipBlind(
        @MessageBody() data: { blindType: SkippableBlindType; round: number },
        @ConnectedSocket() client: GatewayClient,
    ): void {
        const playerId = client.__clientId;
        if (!playerId) {
            this.sendGameEvent(client, GameSocketEvents.Error, {
                code: PLAYER_STATE_CODE.NOT_FOUND,
                message: "Player id is required in skipBlind",
            });
            return;
        }

        const skipBlindResult = this.gameService.skipBlind(data.blindType, data.round, playerId);
        this.sendGameEvent(client, GameSocketEvents.SkipBlind, skipBlindResult);
    }

    private sendGameEvent<T>(client: GatewayClient, event: string, data: T) {
        Logger.log(`-${client.__clientId}---> { event: ${event}, data: ${JSON.stringify(data)} }`);

        client.send(JSON.stringify({ event, data }));
    }
}
