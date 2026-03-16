import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { WsAdapter } from "@nestjs/platform-ws";
import { Logger } from "@nestjs/common";
const logger = new Logger("Bootstrap");

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { abortOnError: false });

    app.enableCors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });

    app.useWebSocketAdapter(new WsAdapter(app));

    await app.listen(8088);
    logger.log("Server is running on http://localhost:8088");
}
bootstrap()
    .then(() => {
        logger.log("Application started successfully");
    })
    .catch((error) => {
        logger.error("Error starting application:", error);
    });
