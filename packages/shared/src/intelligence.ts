import type { ResourceListing, SearchFilters } from "./types.js";

export type ListingLifecycleSignalType =
  | "visit_recorded"
  | "comment_added"
  | "message_sent"
  | "saved"
  | "proposal_created"
  | "rating_added"
  | "rating_count_changed"
  | "booked"
  | "returned"
  | "price_agreed"
  | "price_changed"
  | "damage_reported"
  | "maintenance_completed";

export type ListingLifecycleSignal = {
  type: ListingLifecycleSignalType;
  value?: string | number | boolean;
  note?: string;
  occurredAt: string;
};

export type ListingImageIntelligence = {
  mediaId: string;
  url: string;
  visibleSubject?: string;
  conditionMarkers: string[];
  ageMarkers: string[];
  spaceMarkers: string[];
  lightingMarkers: string[];
  riskMarkers: string[];
  confidence: number;
};

export type ListingIntelligenceProfile = {
  listingId: string;
  profileVersion: number;
  generatedAt: string;
  source: "local_heuristic" | "openai" | "hybrid";
  summary: string;
  normalizedNeedTags: string[];
  visualFactors: ListingImageIntelligence[];
  condition: {
    estimatedAgeBand: "new" | "recent" | "used" | "older" | "unknown";
    modelFreshness: "current" | "recent" | "older" | "unknown";
    visibleWear: string[];
    damageMarkers: string[];
    repairMarkers: string[];
    cleanlinessMarkers: string[];
  };
  spaceQuality: {
    wallCondition: string[];
    windows: string[];
    lighting: string[];
    floorAndTileCondition: string[];
  };
  commercialSignals: {
    averageAgreedPriceKes?: number;
    lastAgreedPriceKes?: number;
    bookingCount: number;
    returnCount: number;
    visitCount: number;
    commentCount: number;
    savedCount: number;
    proposalCount: number;
    ratingAverage: number;
    ratingCount: number;
    demandScore: number;
  };
  lifecycleSignals: ListingLifecycleSignal[];
  raw?: unknown;
};

export type SearchIntelligenceMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  payload?: Record<string, unknown>;
};

export type SearchIntelligenceRecommendation = {
  listingId: string;
  score: number;
  reasons: string[];
  matchedTags: string[];
  profileSummary: string;
};

export type SearchIntelligenceTag = {
  id: string;
  label: string;
  color: string;
  textColor: string;
  matchCount: number;
};

export type SearchIntelligenceSession = {
  id: string;
  userId?: string;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
  query: string;
  filters: SearchFilters;
  messages: SearchIntelligenceMessage[];
  filterTags: SearchIntelligenceTag[];
  recommendations: SearchIntelligenceRecommendation[];
};

const tagPalette = [
  { color: "#DBEAFE", textColor: "#1D4ED8" },
  { color: "#D1FAE5", textColor: "#047857" },
  { color: "#FEF3C7", textColor: "#92400E" },
  { color: "#F3E8FF", textColor: "#7E22CE" },
  { color: "#FCE7F3", textColor: "#BE185D" },
  { color: "#E0E7FF", textColor: "#4338CA" },
  { color: "#CFFAFE", textColor: "#0F766E" },
  { color: "#FFEDD5", textColor: "#C2410C" },
  { color: "#DCFCE7", textColor: "#166534" },
  { color: "#FFE4E6", textColor: "#BE123C" },
  { color: "#EDE9FE", textColor: "#6D28D9" },
  { color: "#CCFBF1", textColor: "#0F766E" }
] as const;

const markerDictionary = {
  damage: ["broken", "bent", "cracked", "damaged", "destroyed", "torn", "rust", "scratched", "faulty"],
  repair: ["repaired", "refurbished", "serviced", "patched", "repainted", "replaced"],
  recent: ["new", "latest", "modern", "mirrorless", "silent", "digital", "led", "current"],
  old: ["old", "vintage", "classic", "legacy", "manual", "aged"],
  space: ["space", "room", "studio", "hall", "yard", "parking", "land", "venue", "office"],
  clean: ["clean", "minimal", "fresh", "sanitized", "white", "spotless"],
  dirty: ["dirty", "dusty", "stained", "smoke", "muddy", "worn"],
  windows: ["window", "windows", "glass", "panoramic", "small windows", "large windows"],
  lighting: ["lighting", "bright", "daylight", "studio light", "led", "dim", "dark"],
  tiles: ["tile", "tiles", "floor", "concrete", "carpet", "wood"]
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function tokenize(value: string): string[] {
  return unique(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2)
  );
}

function tagId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function priceTag(listing: ResourceListing): string {
  const amount = listing.modeRules[0]?.pricing.rate.amount ?? 0;
  if (amount <= 2500) return "Budget price";
  if (amount <= 8500) return "Mid price";
  return "Premium price";
}

function listingSearchTags(listing: ResourceListing, profile?: ListingIntelligenceProfile): string[] {
  const ratingTag = listing.rating >= 4.8 ? "Top rated" : listing.rating >= 4.5 ? "High rating" : "Rated";
  const modeTags = listing.modeRules.map((rule) => titleCase(rule.mode));
  const deliveryTags = listing.logistics.deliveryModes.map((mode) =>
    mode === "countrywide_delivery" ? "Countrywide delivery" : titleCase(mode)
  );
  const conditionTags = [
    ...(profile?.condition.estimatedAgeBand && profile.condition.estimatedAgeBand !== "unknown"
      ? [titleCase(profile.condition.estimatedAgeBand)]
      : []),
    ...(profile?.condition.damageMarkers.length ? ["Damage marker"] : []),
    ...(profile?.condition.repairMarkers.length ? ["Repair marker"] : []),
    ...(profile?.condition.cleanlinessMarkers.filter((marker) => marker !== "cleanliness not inferred").map(titleCase) ?? [])
  ];
  const visualTags = profile?.visualFactors.flatMap((factor) => [
    ...factor.ageMarkers.filter((marker) => marker !== "unknown model age").map(titleCase),
    ...factor.spaceMarkers.filter((marker) => marker !== "not space-specific").map(titleCase),
    ...factor.lightingMarkers.filter((marker) => marker !== "lighting not inferred").map(titleCase),
    ...factor.riskMarkers.filter((marker) => marker !== "no obvious risk marker recorded").map(titleCase)
  ]) ?? [];

  return unique([
    titleCase(listing.kind),
    titleCase(listing.category),
    listing.subCategory ? titleCase(listing.subCategory) : "",
    listing.location.county,
    listing.location.town,
    ratingTag,
    priceTag(listing),
    listing.location.countrywideAvailable ? "Countrywide" : "",
    ...deliveryTags,
    ...modeTags,
    ...conditionTags,
    ...visualTags,
    ...(profile?.normalizedNeedTags.map(titleCase) ?? [])
  ]).slice(0, 32);
}

function matchingMarkers(text: string, markers: string[]): string[] {
  const lowered = text.toLowerCase();
  return markers.filter((marker) => lowered.includes(marker));
}

function markerSummary(markers: string[], fallback: string): string[] {
  return markers.length > 0 ? unique(markers) : [fallback];
}

export function buildLocalListingIntelligence(
  listing: ResourceListing,
  lifecycleSignals: ListingLifecycleSignal[] = []
): ListingIntelligenceProfile {
  const now = new Date().toISOString();
  const listingText = [
    listing.title,
    listing.description,
    listing.category,
    listing.subCategory,
    listing.location.county,
    listing.location.town,
    listing.location.generalArea,
    ...listing.media.map((media) => `${media.alt} ${media.url}`),
    ...Object.values(listing.metadata).map(String)
  ]
    .filter(Boolean)
    .join(" ");

  const damageMarkers = matchingMarkers(listingText, markerDictionary.damage);
  const repairMarkers = matchingMarkers(listingText, markerDictionary.repair);
  const recentMarkers = matchingMarkers(listingText, markerDictionary.recent);
  const oldMarkers = matchingMarkers(listingText, markerDictionary.old);
  const cleanMarkers = matchingMarkers(listingText, markerDictionary.clean);
  const dirtyMarkers = matchingMarkers(listingText, markerDictionary.dirty);
  const spaceMarkers = matchingMarkers(listingText, markerDictionary.space);
  const windowMarkers = matchingMarkers(listingText, markerDictionary.windows);
  const lightingMarkers = matchingMarkers(listingText, markerDictionary.lighting);
  const tileMarkers = matchingMarkers(listingText, markerDictionary.tiles);

  const prices = lifecycleSignals
    .filter((signal) => signal.type === "price_agreed" && typeof signal.value === "number")
    .map((signal) => signal.value as number);
  const bookingCount = lifecycleSignals.filter((signal) => signal.type === "booked").length;
  const returnCount = lifecycleSignals.filter((signal) => signal.type === "returned").length;
  const visitCount = lifecycleSignals.filter((signal) => signal.type === "visit_recorded").length;
  const commentCount = lifecycleSignals.filter((signal) => signal.type === "comment_added" || signal.type === "message_sent").length;
  const savedCount = lifecycleSignals.filter((signal) => signal.type === "saved").length;
  const proposalCount = lifecycleSignals.filter((signal) => signal.type === "proposal_created").length;
  const ratingSignals = lifecycleSignals.filter((signal) => signal.type === "rating_added" && typeof signal.value === "number");
  const ratingAverage =
    ratingSignals.length > 0
      ? ratingSignals.reduce((sum, signal) => sum + (signal.value as number), 0) / ratingSignals.length
      : listing.rating;
  const demandScore = Number(
    Math.min(
      100,
      listing.reviewCount * 1.8 +
        visitCount * 0.4 +
        commentCount * 1.2 +
        savedCount * 2 +
        proposalCount * 5 +
        bookingCount * 8 +
        ratingAverage * 10 +
        prices.length * 4
    ).toFixed(1)
  );

  return {
    listingId: listing.id,
    profileVersion: 1,
    generatedAt: now,
    source: "local_heuristic",
    summary: `${listing.title} in ${listing.location.generalArea}, ${listing.location.county}. ${listing.description}`,
    normalizedNeedTags: unique([
      listing.kind,
      listing.category,
      listing.subCategory ?? "",
      listing.location.county,
      listing.location.town,
      ...tokenize(`${listing.title} ${listing.description}`)
    ]).slice(0, 40),
    visualFactors: listing.media.map((media) => ({
      mediaId: media.id,
      url: media.url,
      visibleSubject: media.alt || listing.title,
      conditionMarkers: markerSummary([...damageMarkers, ...repairMarkers, ...cleanMarkers, ...dirtyMarkers], "no visible marker recorded"),
      ageMarkers: markerSummary([...recentMarkers, ...oldMarkers], "unknown model age"),
      spaceMarkers: markerSummary(spaceMarkers, "not space-specific"),
      lightingMarkers: markerSummary(lightingMarkers, "lighting not inferred"),
      riskMarkers: markerSummary(damageMarkers, "no obvious risk marker recorded"),
      confidence: 0.42
    })),
    condition: {
      estimatedAgeBand: oldMarkers.length > 0 ? "older" : recentMarkers.length > 0 ? "recent" : "unknown",
      modelFreshness: oldMarkers.length > 0 ? "older" : recentMarkers.length > 0 ? "recent" : "unknown",
      visibleWear: markerSummary([...damageMarkers, ...dirtyMarkers], "no wear marker recorded"),
      damageMarkers,
      repairMarkers,
      cleanlinessMarkers: markerSummary([...cleanMarkers, ...dirtyMarkers], "cleanliness not inferred")
    },
    spaceQuality: {
      wallCondition: markerSummary(matchingMarkers(listingText, ["wall", "walls", "clean walls", "dirty walls"]), "not inferred"),
      windows: markerSummary(windowMarkers, "not inferred"),
      lighting: markerSummary(lightingMarkers, "not inferred"),
      floorAndTileCondition: markerSummary(tileMarkers, "not inferred")
    },
    commercialSignals: {
      averageAgreedPriceKes: prices.length > 0 ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : undefined,
      lastAgreedPriceKes: prices.at(-1),
      bookingCount,
      returnCount,
      visitCount,
      commentCount,
      savedCount,
      proposalCount,
      ratingAverage: Number(ratingAverage.toFixed(2)),
      ratingCount: Math.max(listing.reviewCount, ratingSignals.length),
      demandScore
    },
    lifecycleSignals
  };
}

export function scoreListingForNeed(
  need: string,
  listing: ResourceListing,
  profile?: ListingIntelligenceProfile
): SearchIntelligenceRecommendation {
  const needTokens = tokenize(need);
  const profileTags = profile?.normalizedNeedTags ?? [];
  const listingTokenTags = tokenize(`${listing.title} ${listing.description} ${listing.category} ${listing.subCategory ?? ""}`);
  const tagSet = new Set([...profileTags.map((tag) => tag.toLowerCase()), ...listingTokenTags]);
  const matchedTokens = needTokens.filter((token) => tagSet.has(token) || [...tagSet].some((tag) => tag.includes(token)));
  const listingTags = listingSearchTags(listing, profile);
  const matchedTagLabels = listingTags.filter((tag) => {
    const lowered = tag.toLowerCase();
    return needTokens.some((token) => lowered.includes(token)) || matchedTokens.some((token) => lowered.includes(token));
  });
  const fallbackTags = listingTags.filter((tag) =>
    [
      listing.kind,
      listing.category,
      listing.location.county,
      listing.location.town,
      priceTag(listing).toLowerCase(),
      listing.rating >= 4.8 ? "top rated" : ""
    ].some((marker) => marker && tag.toLowerCase().includes(marker.toLowerCase()))
  );
  const categoryBonus = needTokens.includes(listing.category.toLowerCase()) ? 18 : 0;
  const locationBonus = needTokens.includes(listing.location.county.toLowerCase()) || needTokens.includes(listing.location.town.toLowerCase()) ? 10 : 0;
  const conditionPenalty = (profile?.condition.damageMarkers.length ?? 0) * 4;
  const demandBonus = Math.min(16, (profile?.commercialSignals.demandScore ?? listing.rating * 10) / 7);
  const score = Number(Math.max(0, Math.min(100, matchedTokens.length * 12 + categoryBonus + locationBonus + demandBonus - conditionPenalty)).toFixed(1));

  return {
    listingId: listing.id,
    score,
    reasons: unique([
      ...matchedTokens.slice(0, 4).map((token) => `matches "${token}"`),
      categoryBonus > 0 ? `category ${listing.category}` : "",
      locationBonus > 0 ? `near ${listing.location.town}` : "",
      demandBonus > 8 ? "strong marketplace signal" : "",
      conditionPenalty > 0 ? "has condition risk markers" : ""
    ]),
    matchedTags: unique([...matchedTagLabels, ...fallbackTags]).slice(0, 12),
    profileSummary: profile?.summary ?? `${listing.title}: ${listing.description}`
  };
}

export function buildSearchIntelligenceTags(
  recommendations: SearchIntelligenceRecommendation[],
  limit = 20
): SearchIntelligenceTag[] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const recommendation of recommendations) {
    for (const label of recommendation.matchedTags) {
      const id = tagId(label);
      const current = counts.get(id);
      counts.set(id, {
        label,
        count: (current?.count ?? 0) + 1
      });
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1].count - left[1].count || left[1].label.localeCompare(right[1].label))
    .slice(0, limit)
    .map(([id, item], index) => {
      const palette = tagPalette[index % tagPalette.length] ?? tagPalette[0];

      return {
        id,
        label: item.label,
        matchCount: item.count,
        color: palette.color,
        textColor: palette.textColor
      };
    });
}

export function rankListingsForNeed(
  need: string,
  listings: ResourceListing[],
  profiles: Map<string, ListingIntelligenceProfile> | Record<string, ListingIntelligenceProfile> = new Map()
): SearchIntelligenceRecommendation[] {
  const profileFor = (listingId: string) =>
    profiles instanceof Map ? profiles.get(listingId) : profiles[listingId];

  return listings
    .map((listing) => scoreListingForNeed(need, listing, profileFor(listing.id)))
    .filter((recommendation) => recommendation.score > 0)
    .sort((left, right) => right.score - left.score);
}
