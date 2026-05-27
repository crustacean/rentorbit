import {
  seededListings,
  type ContractSummary,
  type KycStatus,
  type ListingIntelligenceProfile,
  type ResourceListing,
  type SearchIntelligenceSession
} from "@rentorbit/shared";

export type UserRecord = {
  id: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  legalName: string;
  idType?: "National ID" | "Passport number" | "Alien ID";
  idNumberLast4?: string;
  kycStatus: KycStatus;
  createdAt: string;
};

export type ChatThreadRecord = {
  id: string;
  listingId: string;
  renterId: string;
  ownerId: string;
  createdAt: string;
};

export type ChatMessageRecord = {
  id: string;
  threadId: string;
  senderId: string;
  type: "text" | "image" | "booking_proposal" | "contract_summary" | "system_event";
  text?: string;
  payload?: unknown;
  isRead: boolean;
  createdAt: string;
};

export type PaymentLedgerEntry = {
  id: string;
  contractId: string;
  userId: string;
  type: "rental_fee" | "platform_fee" | "refundable_deposit" | "owner_payout" | "refund" | "dispute_hold";
  amountKes: number;
  status: "pending" | "succeeded" | "failed" | "reversed" | "held";
  provider: "paystack";
  providerReference: string;
  createdAt: string;
};

export class InMemoryStore {
  readonly users = new Map<string, UserRecord>([
    [
      "usr_owner_asha",
      {
        id: "usr_owner_asha",
        email: "asha@example.com",
        legalName: "Asha Njeri",
        kycStatus: "verified",
        createdAt: new Date().toISOString()
      }
    ],
    [
      "usr_renter_brian",
      {
        id: "usr_renter_brian",
        email: "brian@example.com",
        legalName: "Brian Otieno",
        kycStatus: "verified",
        createdAt: new Date().toISOString()
      }
    ]
  ]);

  readonly listings = new Map<string, ResourceListing>(seededListings.map((listing) => [listing.id, listing]));
  readonly threads = new Map<string, ChatThreadRecord>();
  readonly messages = new Map<string, ChatMessageRecord>();
  readonly contracts = new Map<string, ContractSummary>();
  readonly ledger = new Map<string, PaymentLedgerEntry>();
  readonly listingIntelligence = new Map<string, ListingIntelligenceProfile>();
  readonly intelligenceSessions = new Map<string, SearchIntelligenceSession>();

  nextId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export const store = new InMemoryStore();
