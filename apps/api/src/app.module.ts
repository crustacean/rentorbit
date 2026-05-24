import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module.js";
import { ChatModule } from "./chat/chat.module.js";
import { ContractsModule } from "./contracts/contracts.module.js";
import { KycModule } from "./kyc/kyc.module.js";
import { ListingsModule } from "./listings/listings.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { PaymentsModule } from "./payments/payments.module.js";
import { RealtimeModule } from "./realtime/realtime.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ListingsModule,
    ChatModule,
    ContractsModule,
    PaymentsModule,
    KycModule,
    NotificationsModule,
    RealtimeModule
  ]
})
export class AppModule {}
