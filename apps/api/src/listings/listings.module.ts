import { Module } from "@nestjs/common";
import { IntelligenceModule } from "../intelligence/intelligence.module.js";
import { ListingsController } from "./listings.controller.js";
import { ListingsService } from "./listings.service.js";

@Module({
  imports: [IntelligenceModule],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService]
})
export class ListingsModule {}
