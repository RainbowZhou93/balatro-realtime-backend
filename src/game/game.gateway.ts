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
import { SkippableBlindType, GameCommandResult } from "./types";
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
            this.sendGameEvent(client, GameSocketEvents.GameError, {
                code: PLAYER_STATE_CODE.CLIENT_ID_NOT_FOUND,
                message: "Player id is required for initGame.",
            });
            return;
        }
        const gameInfo = this.gameService.initGame(playerId);
        this.sendGameEvent(client, GameSocketEvents.GameInitialized, gameInfo);
    }

    @SubscribeMessage("startGame")
    handleStartGame(@MessageBody() _data: object, @ConnectedSocket() client: GatewayClient): void {
        const playerId = client.__clientId;
        if (!playerId) {
            this.sendGameEvent(client, GameSocketEvents.GameError, {
                code: PLAYER_STATE_CODE.CLIENT_ID_NOT_FOUND,
                message: "Player id is required for startGame.",
            });
            return;
        }

        const dealResult = this.gameService.startGame(playerId);
        this.sendGameEvent(client, GameSocketEvents.GameStarted, dealResult);
    }

    @SubscribeMessage("selectCards")
    handlePlayCards(
        @MessageBody() data: { selectedCards: string[]; action: "play" | "discard" },
        @ConnectedSocket() client: GatewayClient,
    ): void {
        const playerId = client.__clientId;
        if (!playerId) {
            this.sendGameEvent(client, GameSocketEvents.GameError, {
                code: PLAYER_STATE_CODE.CLIENT_ID_NOT_FOUND,
                message: "Player id is required for selectCards.",
            });
            return;
        }
        const selectCardsResult = this.gameService.selectCards(data.selectedCards, data.action, playerId);
        this.sendGameCommandResult(client, selectCardsResult);
    }

    @SubscribeMessage("skipBlind")
    handleSkipBlind(
        @MessageBody() data: { blindType: SkippableBlindType; round: number },
        @ConnectedSocket() client: GatewayClient,
    ): void {
        const playerId = client.__clientId;
        if (!playerId) {
            this.sendGameEvent(client, GameSocketEvents.GameError, {
                code: PLAYER_STATE_CODE.CLIENT_ID_NOT_FOUND,
                message: "Player id is required for skipBlind",
            });
            return;
        }

        const skipBlindResult = this.gameService.skipBlind(data.blindType, data.round, playerId);
        console.log(`----skipBlindResult: ${JSON.stringify(skipBlindResult)}`);
        this.sendGameCommandResult(client, skipBlindResult);
    }

    @SubscribeMessage("buyShopItem")
    handleBuyShopItem(@MessageBody() data: { instanceId: string }, @ConnectedSocket() client: GatewayClient): void {
        const playerId = client.__clientId;

        if (!playerId) {
            this.sendGameEvent(client, GameSocketEvents.GameError, {
                code: PLAYER_STATE_CODE.CLIENT_ID_NOT_FOUND,
                message: "Player id is required for buyShopItem.",
            });
            return;
        }

        const result = this.gameService.buyShopItem(playerId, data.instanceId);

        this.sendGameCommandResult(client, result);
    }

    @SubscribeMessage("rerollShop")
    handleRerollShop(@MessageBody() _data: object, @ConnectedSocket() client: GatewayClient): void {
        const playerId = client.__clientId;

        if (!playerId) {
            this.sendGameEvent(client, GameSocketEvents.GameError, {
                code: PLAYER_STATE_CODE.CLIENT_ID_NOT_FOUND,
                message: "Player id is required for rerollShop.",
            });
            return;
        }

        const result = this.gameService.rerollShop(playerId);

        this.sendGameCommandResult(client, result);
    }

    @SubscribeMessage("enterNextRound")
    handleEnterNextRound(@MessageBody() _data: object, @ConnectedSocket() client: GatewayClient): void {
        const playerId = client.__clientId;

        if (!playerId) {
            this.sendGameEvent(client, GameSocketEvents.GameError, {
                code: PLAYER_STATE_CODE.CLIENT_ID_NOT_FOUND,
                message: "Player id is required for enterNextRound.",
            });
            return;
        }

        const result = this.gameService.enterNextRound(playerId);

        this.sendGameCommandResult(client, result);
    }

    private sendGameCommandResult(client: GatewayClient, result: GameCommandResult): void {
        if (result.actionResult) {
            this.sendGameEvent(client, GameSocketEvents.ActionResult, result.actionResult);
        }

        for (const event of result.events ?? []) {
            this.sendGameEvent(client, event.type, event.payload || {});
        }

        if (result.state) {
            this.sendGameEvent(client, GameSocketEvents.StateChanged, result.state);
        }
    }

    private sendGameEvent<T>(client: GatewayClient, event: string, data: T) {
        this.logger.log(`-${client.__clientId}---> { event: ${event}, data: ${JSON.stringify(data)} }`);

        client.send(JSON.stringify({ event, data }));
    }
}
