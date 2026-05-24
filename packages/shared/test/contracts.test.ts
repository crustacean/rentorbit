import { describe, expect, it } from "vitest";
import { createContractSummary } from "../src/contracts.js";
import { seededListings } from "../src/sample-data.js";

describe("contracts", () => {
  it("creates a deterministic contract summary from booking terms", () => {
    const contract = createContractSummary({
      id: "ctr_001",
      threadId: "thr_001",
      listing: seededListings[0],
      owner: { userId: "owner_1", legalName: "Asha Njeri", role: "owner" },
      renter: { userId: "renter_1", legalName: "Brian Otieno", role: "renter" },
      mode: "owner_operated",
      bookingWindow: {
        start: "2026-06-16T09:00:00+03:00",
        end: "2026-06-17T09:00:00+03:00"
      },
      createdAt: "2026-05-24T12:00:00+03:00"
    });

    expect(contract.status).toBe("draft");
    expect(contract.quote.deposit.amount).toBe(0);
    expect(contract.quote.totalDueNow.currency).toBe("KES");
    expect(contract.payloadFingerprint).toMatch(/^fnv1a-/);
  });
});
