//根模块用于处理其他类的引用与共享
import { Module } from "@nestjs/common";
import { GameModule } from "./game/game.module";
import { PokerModule } from "./poker/poker.module";

@Module({
    imports: [GameModule, PokerModule],
    providers: [],
})
export class AppModule {}
