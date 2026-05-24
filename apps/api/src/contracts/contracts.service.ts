import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  createContractSummary,
  type ContractParty,
  type ContractSignature,
  type ContractSummary,
  type DateTimeWindow,
  type OperationMode
} from "@rentorbit/shared";
import { createHash } from "node:crypto";
import { store } from "../common/in-memory-store.js";
import { ChatService } from "../chat/chat.service.js";
import { ListingsService } from "../listings/listings.service.js";

function cryptographicPayloadHash(contract: ContractSummary): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        listingId: contract.listingId,
        threadId: contract.threadId,
        owner: contract.owner,
        renter: contract.renter,
        bookingWindow: contract.bookingWindow,
        mode: contract.mode,
        quote: contract.quote,
        termsVersion: contract.termsVersion
      })
    )
    .digest("hex");
}

@Injectable()
export class ContractsService {
  constructor(
    @Inject(ListingsService) private readonly listingsService: ListingsService,
    @Inject(ChatService) private readonly chatService: ChatService
  ) {}

  createProposal(input: {
    listingId: string;
    threadId: string;
    owner: ContractParty;
    renter: ContractParty;
    bookingWindow: DateTimeWindow;
    mode: OperationMode;
  }): ContractSummary {
    const listing = this.listingsService.getById(input.listingId);
    const contract = createContractSummary({
      id: store.nextId("ctr"),
      threadId: input.threadId,
      listing,
      owner: input.owner,
      renter: input.renter,
      bookingWindow: input.bookingWindow,
      mode: input.mode,
      createdAt: new Date().toISOString()
    });
    contract.payloadFingerprint = `sha256-${cryptographicPayloadHash(contract)}`;
    store.contracts.set(contract.id, contract);
    this.chatService.addMessage({
      threadId: input.threadId,
      senderId: input.renter.userId,
      type: "booking_proposal",
      payload: contract
    });
    return contract;
  }

  getContract(id: string): ContractSummary {
    const contract = store.contracts.get(id);
    if (!contract) {
      throw new NotFoundException(`Contract ${id} was not found`);
    }
    return contract;
  }

  signContract(id: string, signature: Omit<ContractSignature, "signedAt">): ContractSummary {
    const contract = this.getContract(id);
    if (contract.status === "voided") {
      throw new BadRequestException("Voided contracts cannot be signed");
    }
    if (contract.status === "fully_executed") {
      throw new BadRequestException("Fully executed contracts are immutable; void and propose an amendment instead");
    }

    const allowedSignerIds = new Set([contract.owner.userId, contract.renter.userId]);
    if (!allowedSignerIds.has(signature.userId)) {
      throw new BadRequestException("Only the owner and renter can sign this contract");
    }
    if (contract.signatures.some((existing) => existing.userId === signature.userId)) {
      throw new BadRequestException("This user has already signed the contract");
    }

    contract.signatures.push({ ...signature, signedAt: new Date().toISOString() });
    contract.status = contract.signatures.length === 2 ? "fully_executed" : "partially_signed";
    store.contracts.set(contract.id, contract);

    this.chatService.addMessage({
      threadId: contract.threadId,
      senderId: signature.userId,
      type: "contract_summary",
      payload: contract
    });

    return contract;
  }

  voidAndProposeAmendment(
    id: string,
    input: {
      requestedByUserId: string;
      bookingWindow: DateTimeWindow;
      mode: OperationMode;
    }
  ): ContractSummary {
    const original = this.getContract(id);
    if (original.status === "voided") {
      throw new BadRequestException("Contract is already voided");
    }

    original.status = "voided";
    store.contracts.set(original.id, original);

    const amendment = this.createProposal({
      listingId: original.listingId,
      threadId: original.threadId,
      owner: original.owner,
      renter: original.renter,
      bookingWindow: input.bookingWindow,
      mode: input.mode
    });
    amendment.voidedByContractId = original.id;
    store.contracts.set(amendment.id, amendment);

    this.chatService.addMessage({
      threadId: original.threadId,
      senderId: input.requestedByUserId,
      type: "system_event",
      text: `Contract ${original.id} was voided and amendment ${amendment.id} was proposed.`
    });

    return amendment;
  }
}
