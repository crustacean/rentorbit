import { BadRequestException, Injectable } from "@nestjs/common";
import { store, type PaymentLedgerEntry } from "../common/in-memory-store.js";

@Injectable()
export class PaymentsService {
  collectForContract(input: { contractId: string; userId: string }): PaymentLedgerEntry[] {
    const contract = store.contracts.get(input.contractId);
    if (!contract) {
      throw new BadRequestException("Contract not found");
    }
    if (contract.status !== "fully_executed") {
      throw new BadRequestException("Both signatures are required before payment collection");
    }

    const now = new Date().toISOString();
    const entries: PaymentLedgerEntry[] = [
      {
        id: store.nextId("led"),
        contractId: contract.id,
        userId: input.userId,
        type: "rental_fee",
        amountKes: contract.quote.rentalFee.amount,
        status: "succeeded",
        provider: "paystack",
        providerReference: store.nextId("paystack_ref"),
        createdAt: now
      },
      {
        id: store.nextId("led"),
        contractId: contract.id,
        userId: input.userId,
        type: "platform_fee",
        amountKes: contract.quote.platformFee.amount,
        status: "succeeded",
        provider: "paystack",
        providerReference: store.nextId("paystack_ref"),
        createdAt: now
      }
    ];

    if (contract.quote.deposit.amount > 0) {
      entries.push({
        id: store.nextId("led"),
        contractId: contract.id,
        userId: input.userId,
        type: "refundable_deposit",
        amountKes: contract.quote.deposit.amount,
        status: "held",
        provider: "paystack",
        providerReference: store.nextId("paystack_ref"),
        createdAt: now
      });
    }

    for (const entry of entries) {
      store.ledger.set(entry.id, entry);
    }

    return entries;
  }

  refundDeposit(contractId: string): PaymentLedgerEntry {
    const heldDeposit = [...store.ledger.values()].find(
      (entry) => entry.contractId === contractId && entry.type === "refundable_deposit" && entry.status === "held"
    );
    if (!heldDeposit) {
      throw new BadRequestException("No held deposit found for this contract");
    }

    heldDeposit.status = "reversed";
    const refund: PaymentLedgerEntry = {
      id: store.nextId("led"),
      contractId,
      userId: heldDeposit.userId,
      type: "refund",
      amountKes: heldDeposit.amountKes,
      status: "succeeded",
      provider: "paystack",
      providerReference: store.nextId("paystack_refund"),
      createdAt: new Date().toISOString()
    };
    store.ledger.set(heldDeposit.id, heldDeposit);
    store.ledger.set(refund.id, refund);
    return refund;
  }
}
