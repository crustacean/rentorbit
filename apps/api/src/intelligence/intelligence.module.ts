import { Module } from "@nestjs/common";
import { IntelligenceController } from "./intelligence.controller.js";
import { IntelligenceService } from "./intelligence.service.js";
import { OpenAiIntelligenceClient } from "./openai-intelligence.client.js";

@Module({
  controllers: [IntelligenceController],
  providers: [IntelligenceService, OpenAiIntelligenceClient],
  exports: [IntelligenceService]
})
export class IntelligenceModule {}
