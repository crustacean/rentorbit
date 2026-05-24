export const listingKinds = ["good", "service", "personnel"] as const;
export type ListingKind = (typeof listingKinds)[number];

export const operationModes = ["self_operated", "owner_operated", "operator_only"] as const;
export type OperationMode = (typeof operationModes)[number];

export const deliveryModes = ["pickup", "local_delivery", "regional_delivery", "countrywide_delivery"] as const;
export type DeliveryMode = (typeof deliveryModes)[number];

export const billingMetrics = ["hourly", "daily", "weekly", "fixed"] as const;
export type BillingMetric = (typeof billingMetrics)[number];

export const listingStatuses = ["draft", "active", "paused", "suspended"] as const;
export type ListingStatus = (typeof listingStatuses)[number];

export const bookingStatuses = [
  "proposal",
  "awaiting_signatures",
  "awaiting_payment",
  "booked",
  "active",
  "returned",
  "disputed",
  "cancelled",
  "completed"
] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export const contractStatuses = ["draft", "partially_signed", "fully_executed", "voided"] as const;
export type ContractStatus = (typeof contractStatuses)[number];

export const messageTypes = ["text", "image", "booking_proposal", "contract_summary", "system_event"] as const;
export type MessageType = (typeof messageTypes)[number];

export const kycStatuses = ["not_started", "pending", "verified", "rejected", "expired"] as const;
export type KycStatus = (typeof kycStatuses)[number];

export type Money = {
  amount: number;
  currency: "KES";
};

export type DateTimeWindow = {
  start: string;
  end: string;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type ListingMedia = {
  id: string;
  url: string;
  alt: string;
  isPrimary?: boolean;
};

export type PricingRule = {
  billingMetric: BillingMetric;
  rate: Money;
  minimumUnits: number;
  deposit?: Money;
  replacementValue?: Money;
  platformFeeRate: number;
};

export type ModeRule = {
  mode: OperationMode;
  label: string;
  pricing: PricingRule;
  requiresKyc: boolean;
  requiresDeposit: boolean;
};

export type LocationProfile = {
  country: "Kenya";
  county: string;
  town: string;
  generalArea: string;
  exactCoordinates: Coordinates;
  maxTravelRadiusKm?: number;
  countrywideAvailable: boolean;
};

export type LogisticsProfile = {
  deliveryModes: DeliveryMode[];
  returnRequirements?: string;
  setupTimeMinutes?: number;
  overtimeRate?: Money;
  providesOwnTransport?: boolean;
};

export type ResourceListing = {
  id: string;
  ownerId: string;
  kind: ListingKind;
  category: string;
  subCategory?: string;
  title: string;
  description: string;
  status: ListingStatus;
  media: ListingMedia[];
  location: LocationProfile;
  modeRules: ModeRule[];
  logistics: LogisticsProfile;
  unavailableWindows: DateTimeWindow[];
  rating: number;
  reviewCount: number;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
};

export type SearchFilters = {
  query?: string;
  category?: string;
  county?: string;
  town?: string;
  origin?: Coordinates;
  radiusKm?: number;
  start?: string;
  end?: string;
  operationMode?: OperationMode;
  deliveryMode?: DeliveryMode;
  includeCountrywide?: boolean;
};

export type SearchResult = {
  listing: ResourceListing;
  distanceKm?: number;
  publicCoordinates: Coordinates;
  availabilityState: "available" | "unavailable_for_window";
};

export type BookingQuoteInput = {
  listing: ResourceListing;
  mode: OperationMode;
  start: string;
  end: string;
};

export type BookingQuote = {
  mode: OperationMode;
  units: number;
  rentalFee: Money;
  platformFee: Money;
  deposit: Money;
  totalDueNow: Money;
};

export type ContractParty = {
  userId: string;
  legalName: string;
  role: "owner" | "renter";
};

export type ContractSignature = {
  userId: string;
  printedName: string;
  signedAt: string;
  ipAddress: string;
  userAgent: string;
};

export type ContractSummary = {
  id: string;
  listingId: string;
  threadId: string;
  owner: ContractParty;
  renter: ContractParty;
  bookingWindow: DateTimeWindow;
  mode: OperationMode;
  quote: BookingQuote;
  termsVersion: string;
  status: ContractStatus;
  signatures: ContractSignature[];
  voidedByContractId?: string;
  payloadFingerprint: string;
  createdAt: string;
};
