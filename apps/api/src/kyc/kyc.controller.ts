import { Body, Controller, Inject, Post } from "@nestjs/common";
import { type IprsCheckRequest, KycService } from "./kyc.service.js";

@Controller("kyc")
export class KycController {
  constructor(@Inject(KycService) private readonly kycService: KycService) {}

  @Post("start")
  start(@Body() body: { userId: string }) {
    return this.kycService.startVerification(body.userId);
  }

  @Post("iprs-check")
  iprsCheck(@Body() body: IprsCheckRequest) {
    return this.kycService.validateIprsIdentity(body);
  }

  @Post("provider-callback/verified")
  verified(@Body() body: { userId: string }) {
    return this.kycService.markVerified(body.userId);
  }
}
