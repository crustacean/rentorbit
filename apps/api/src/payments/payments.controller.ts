import { Body, Controller, Inject, Param, Post } from "@nestjs/common";
import { PaymentsService } from "./payments.service.js";

@Controller("payments")
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly paymentsService: PaymentsService) {}

  @Post("collect")
  collect(@Body() body: { contractId: string; userId: string }) {
    return this.paymentsService.collectForContract(body);
  }

  @Post("contracts/:contractId/refund-deposit")
  refundDeposit(@Param("contractId") contractId: string) {
    return this.paymentsService.refundDeposit(contractId);
  }
}
