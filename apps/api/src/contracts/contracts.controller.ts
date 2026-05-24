import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import type { ContractParty, DateTimeWindow, OperationMode } from "@rentorbit/shared";
import { ContractsService } from "./contracts.service.js";

@Controller("contracts")
export class ContractsController {
  constructor(@Inject(ContractsService) private readonly contractsService: ContractsService) {}

  @Get(":id")
  getContract(@Param("id") id: string) {
    return this.contractsService.getContract(id);
  }

  @Post("proposals")
  createProposal(
    @Body()
    body: {
      listingId: string;
      threadId: string;
      owner: ContractParty;
      renter: ContractParty;
      bookingWindow: DateTimeWindow;
      mode: OperationMode;
    }
  ) {
    return this.contractsService.createProposal(body);
  }

  @Post(":id/sign")
  sign(
    @Param("id") id: string,
    @Body() body: { userId: string; printedName: string; ipAddress?: string; userAgent?: string }
  ) {
    return this.contractsService.signContract(id, {
      userId: body.userId,
      printedName: body.printedName,
      ipAddress: body.ipAddress ?? "127.0.0.1",
      userAgent: body.userAgent ?? "rentorbit-dev"
    });
  }

  @Post(":id/void-and-amend")
  voidAndAmend(
    @Param("id") id: string,
    @Body() body: { requestedByUserId: string; bookingWindow: DateTimeWindow; mode: OperationMode }
  ) {
    return this.contractsService.voidAndProposeAmendment(id, body);
  }
}
