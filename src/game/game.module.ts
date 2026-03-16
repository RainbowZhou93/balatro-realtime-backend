//只负责组织依赖，注册provider、导出service
import { Module } from "@nestjs/common";
import { GameGateway } from "./game.gateway";
import { GameService } from "./game.service";
import { PokerModule } from "../poker/poker.module";

@Module({
    imports: [PokerModule], //引入别的模块
    providers: [GameGateway, GameService],
})
export class GameModule {}
