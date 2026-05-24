import { Module } from "@nestjs/common";
import { KycModule } from "../kyc/kyc.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

@Module({
  imports: [KycModule],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}
