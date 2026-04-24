import { INestApplicationContext } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import { MessageMappingProperties } from "@nestjs/websockets";
import { fromEvent, Observable } from "rxjs";
import { mergeMap, filter } from "rxjs/operators";
import * as WebSocket from "ws";
import { Logger } from "@nestjs/common";

export class CustomWsAdapter extends WsAdapter {
    private clientIdCounter = 1;
    constructor(app: INestApplicationContext) {
        super(app);
    }

    bindMessageHandlers(
        client: WebSocket,
        handlers: MessageMappingProperties[],
        process: (data: any) => Observable<any>,
    ) {
        let clientId = (client as any).__clientId;
        if (!clientId) {
            clientId = `client_${this.clientIdCounter++}`;
            (client as any).__clientId = clientId;
        }
        Logger.log(`Client connected: ${clientId}`);
        fromEvent(client, "message")
            .pipe(
                mergeMap((data) => {
                    return this.handleRawMessage(data, handlers, process, clientId);
                }),
                filter((result) => result !== undefined && result !== null),
            )
            .subscribe((response) => {
                Logger.log(`-${clientId}---> ${JSON.stringify(response)}`);
                client.send(JSON.stringify(response));
            });
    }

    handleRawMessage(
        buffer,
        handlers: MessageMappingProperties[],
        process: (data: any) => Observable<any>,
        clientId: string,
    ): Observable<any> {
        let errorMsg: null | object = null;
        try {
            const message = JSON.parse(buffer.data);
            Logger.log(`<---${clientId}- ${JSON.stringify(message)}`);
            if (typeof message !== "object" || message === null) {
                errorMsg = {
                    event: "error",
                    data: { code: "INVALID_MESSAGE_FORMAT", message: "Message must be a JSON object" },
                };
            } else if (!message.event || typeof message.event !== "string") {
                errorMsg = {
                    event: "error",
                    data: { code: "INVALID_MESSAGE_FORMAT", message: `Not found event: ${message.event}` },
                };
            }

            if (errorMsg) {
                return new Observable((observer) => {
                    observer.next(errorMsg);
                    observer.complete();
                });
            }
            const messageHandler = handlers.find((handler) => handler.message === message.event);

            if (!messageHandler) {
                errorMsg = {
                    event: "error",
                    data: { code: "UNKNOWN_EVENT", message: `Unknown event: ${message.event}` },
                };
                return new Observable((observer) => {
                    observer.next(errorMsg);
                    observer.complete();
                });
            }
            return process(messageHandler.callback(message.data));
        } catch (error) {
            Logger.error(`Error processing message: `, error);
            errorMsg = {
                event: "error",
                data: { code: "INVALID_JSON", message: "Message must be valid JSON" },
            };
            return new Observable((observer) => {
                observer.next(errorMsg);
                observer.complete();
            });
        }
    }
}
