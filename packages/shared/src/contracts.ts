import type { ContractParty, ContractSummary, DateTimeWindow, OperationMode, ResourceListing } from "./types.js";
import { calculateBookingQuote } from "./pricing.js";

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function payloadFingerprint(value: unknown): string {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createContractSummary(input: {
  id: string;
  threadId: string;
  listing: ResourceListing;
  owner: ContractParty;
  renter: ContractParty;
  bookingWindow: DateTimeWindow;
  mode: OperationMode;
  createdAt: string;
  termsVersion?: string;
}): ContractSummary {
  const quote = calculateBookingQuote({
    listing: input.listing,
    mode: input.mode,
    start: input.bookingWindow.start,
    end: input.bookingWindow.end
  });

  const payload = {
    listingId: input.listing.id,
    threadId: input.threadId,
    owner: input.owner,
    renter: input.renter,
    bookingWindow: input.bookingWindow,
    mode: input.mode,
    quote,
    termsVersion: input.termsVersion ?? "ke-v1"
  };

  return {
    id: input.id,
    listingId: input.listing.id,
    threadId: input.threadId,
    owner: input.owner,
    renter: input.renter,
    bookingWindow: input.bookingWindow,
    mode: input.mode,
    quote,
    termsVersion: input.termsVersion ?? "ke-v1",
    status: "draft",
    signatures: [],
    payloadFingerprint: payloadFingerprint(payload),
    createdAt: input.createdAt
  };
}
