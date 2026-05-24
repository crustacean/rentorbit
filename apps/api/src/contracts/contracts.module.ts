import { Module } from "@nestjs/common";
import { ChatModule } from "../chat/chat.module.js";
import { ListingsModule } from "../listings/listings.module.js";
import { ContractsController } from "./contracts.controller.js";
import { ContractsService } from "./contracts.service.js";

@Module({
  imports: [ListingsModule, ChatModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService]
})
export class ContractsModule {}
