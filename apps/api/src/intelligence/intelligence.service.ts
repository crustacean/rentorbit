import { Injectable, Logger, NotFoundException, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  buildLocalListingIntelligence,
  buildSearchIntelligenceTags,
  filterListings,
  rankListingsForNeed,
  type ListingIntelligenceProfile,
  type ListingLifecycleSignal,
  type ResourceListing,
  type SearchFilters,
  type SearchIntelligenceMessage,
  type SearchIntelligenceRecommendation,
  type SearchIntelligenceSession
} from "@rentorbit/shared";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { store } from "../common/in-memory-store.js";
import { OpenAiIntelligenceClient } from "./openai-intelligence.client.js";

type IntelligenceContainerRecord = {
  id: string;
  label: string;
  purpose: "listing_analysis" | "search_session";
  ownerHash: string;
  createdAt: string;
  expiresAt?: string;
};

type StartSearchSessionInput = {
  query?: string;
  filters?: SearchFilters;
  userId?: string;
};

type SearchMessageInput = {
  message: string;
  query?: string;
  filters?: SearchFilters;
  payload?: Record<string, unknown>;
};

function relevantSearchTokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter((token) => token.length > 2)
  );
}

function isRelevantSearchHistory(history: string, query: string): boolean {
  const queryTokens = relevantSearchTokens(query);

  if (queryTokens.size === 0) {
    return false;
  }

  const historyTokens = relevantSearchTokens(history);

  return [...queryTokens].some((token) => historyTokens.has(token));
}

@Injectable()
export class IntelligenceService implements OnModuleInit {
  private readonly logger = new Logger(IntelligenceService.name);
  private readonly sessionTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly containers = new Map<string, IntelligenceContainerRecord>();

  constructor(
    private readonly config: ConfigService,
    private readonly openAiClient: OpenAiIntelligenceClient
  ) {}

  async onModuleInit() {
    await this.mapSeededListings();
  }

  async mapSeededListings(): Promise<{ mapped: number; total: number }> {
    const listings = [...store.listings.values()];
    let mapped = 0;

    for (const listing of listings) {
      if (store.listingIntelligence.has(listing.id)) {
        continue;
      }

      const profile = buildLocalListingIntelligence(listing);
      store.listingIntelligence.set(listing.id, profile);
      await this.writeListingProfile(profile);
      mapped += 1;
    }

    this.logger.log(`Mapped ${mapped}/${listings.length} seeded listing intelligence profile(s)`);
    return {
      mapped,
      total: listings.length
    };
  }

  getListingProfile(listingId: string): ListingIntelligenceProfile {
    const profile = store.listingIntelligence.get(listingId);

    if (!profile) {
      throw new NotFoundException(`No intelligence profile exists for listing ${listingId}`);
    }

    return profile;
  }

  async analyzeListingNow(listingId: string, userId = "system"): Promise<ListingIntelligenceProfile> {
    const listing = store.listings.get(listingId);

    if (!listing) {
      throw new NotFoundException(`Listing ${listingId} was not found`);
    }

    const container = this.createContainer("listing_analysis", `${userId}:${listingId}`);
    this.logger.log(`Started listing intelligence container ${container.label} for ${listingId}`);

    const existingSignals = store.listingIntelligence.get(listingId)?.lifecycleSignals ?? [];
    const baseProfile = buildLocalListingIntelligence(listing, existingSignals);
    const enrichedProfile = await this.openAiClient.enrichListingProfile(listing, baseProfile);

    store.listingIntelligence.set(listingId, enrichedProfile);
    await this.writeListingProfile(enrichedProfile);
    this.logger.log(`Stored listing intelligence profile for ${listingId}`);

    return enrichedProfile;
  }

  queueListingAnalysis(listing: ResourceListing, userId: string): IntelligenceContainerRecord {
    const container = this.createContainer("listing_analysis", `${userId}:${listing.id}`);
    const delayMs = this.randomizedDelayMs();

    setTimeout(() => {
      void this.analyzeListingNow(listing.id, userId).catch((error) => {
        this.logger.warn(`Queued listing analysis failed for ${listing.id}: ${error instanceof Error ? error.message : "unknown error"}`);
      });
    }, delayMs).unref?.();

    return container;
  }

  async recordListingSignal(listingId: string, signal: ListingLifecycleSignal): Promise<ListingIntelligenceProfile> {
    const listing = store.listings.get(listingId);

    if (!listing) {
      throw new NotFoundException(`Listing ${listingId} was not found`);
    }

    const currentProfile = store.listingIntelligence.get(listingId) ?? buildLocalListingIntelligence(listing);
    const nextSignals = [...currentProfile.lifecycleSignals, signal];
    const nextProfile = buildLocalListingIntelligence(listing, nextSignals);

    store.listingIntelligence.set(listingId, nextProfile);
    await this.writeListingProfile(nextProfile);

    const refreshDelay = this.randomizedDelayMs(2_000);
    setTimeout(() => {
      void this.analyzeListingNow(listingId, "signal-refresh").catch((error) => {
        this.logger.warn(`Signal-triggered listing refresh failed for ${listingId}: ${error instanceof Error ? error.message : "unknown error"}`);
      });
    }, refreshDelay).unref?.();

    return nextProfile;
  }

  async startSearchSession(input: StartSearchSessionInput): Promise<SearchIntelligenceSession> {
    const now = new Date();
    const sessionId = this.hashId(`${input.userId ?? "anonymous"}:${input.query ?? ""}:${now.toISOString()}`);
    const container = this.createContainer("search_session", `${input.userId ?? "anonymous"}:${sessionId}`, this.sessionTtlMs());
    const query = input.query?.trim() ?? "";
    const filters = input.filters ?? {};
    const messages: SearchIntelligenceMessage[] = [
      {
        role: "system",
        content: "RentOrbit search intelligence session opened.",
        createdAt: now.toISOString()
      }
    ];

    if (query) {
      messages.push({
        role: "user",
        content: `Search started: ${query}`,
        createdAt: now.toISOString(),
        payload: {
          kind: "search_update",
          query,
          filters
        }
      });
    }

    const recommendations = await this.recommend(query, filters, messages);
    const filterTags = buildSearchIntelligenceTags(recommendations);

    const session: SearchIntelligenceSession = {
      id: sessionId,
      userId: input.userId,
      createdAt: now.toISOString(),
      lastActiveAt: now.toISOString(),
      expiresAt: container.expiresAt ?? new Date(now.getTime() + this.sessionTtlMs()).toISOString(),
      query,
      filters,
      messages,
      filterTags,
      recommendations
    };

    store.intelligenceSessions.set(sessionId, session);
    this.scheduleSessionExpiry(sessionId);
    this.logger.log(`Started search intelligence container ${container.label} for session ${sessionId}`);

    return session;
  }

  async continueSearchSession(sessionId: string, input: SearchMessageInput): Promise<SearchIntelligenceSession> {
    const session = store.intelligenceSessions.get(sessionId);

    if (!session) {
      throw new NotFoundException(`Search intelligence session ${sessionId} was not found or has expired`);
    }

    const now = new Date();
    const userMessage: SearchIntelligenceMessage = {
      role: "user",
      content: input.message,
      createdAt: now.toISOString(),
      payload: input.payload
    };
    const payloadKind = typeof input.payload?.kind === "string" ? input.payload.kind : undefined;
    const nextFilters = input.filters ?? session.filters;

    if (payloadKind === "tag_reset") {
      const assistantMessage: SearchIntelligenceMessage = {
        role: "assistant",
        content: "AI filter tags and the active search query were cleared. I will keep useful session context for the next search.",
        createdAt: now.toISOString()
      };
      const nextSession: SearchIntelligenceSession = {
        ...session,
        lastActiveAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + this.sessionTtlMs()).toISOString(),
        query: "",
        filters: {
          ...nextFilters,
          query: undefined
        },
        messages: [...session.messages, userMessage, assistantMessage],
        filterTags: [],
        recommendations: []
      };

      store.intelligenceSessions.set(sessionId, nextSession);
      this.scheduleSessionExpiry(sessionId);

      return nextSession;
    }

    const nextQuery = input.query?.trim() || session.query;
    const needMessages = session.messages
      .filter((message) => message.role === "user")
      .filter((message) => {
        const kind = typeof message.payload?.kind === "string" ? message.payload.kind : "search_update";
        return kind === "search_update";
      })
      .filter((message) => isRelevantSearchHistory(message.content, nextQuery))
      .slice(-6)
      .map((message) => message.content);
    const combinedNeed = [nextQuery, ...needMessages, payloadKind === "search_update" ? input.message : ""]
      .filter(Boolean)
      .join(" ");
    const recommendations = await this.recommend(combinedNeed, nextFilters, [...session.messages, userMessage]);
    const filterTags = buildSearchIntelligenceTags(recommendations);
    const assistantMessage: SearchIntelligenceMessage = {
      role: "assistant",
      content:
        recommendations.length > 0
          ? `I found ${recommendations.length} matching resource${recommendations.length === 1 ? "" : "s"} based on your need.`
          : "I could not find a strong match yet. Try broadening the category, location, date, or delivery filter.",
      createdAt: now.toISOString()
    };
    const nextSession: SearchIntelligenceSession = {
      ...session,
      lastActiveAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.sessionTtlMs()).toISOString(),
      query: nextQuery,
      filters: nextFilters,
      messages: [...session.messages, userMessage, assistantMessage],
      filterTags,
      recommendations
    };

    store.intelligenceSessions.set(sessionId, nextSession);
    this.scheduleSessionExpiry(sessionId);

    return nextSession;
  }

  getSearchSession(sessionId: string): SearchIntelligenceSession {
    const session = store.intelligenceSessions.get(sessionId);

    if (!session) {
      throw new NotFoundException(`Search intelligence session ${sessionId} was not found or has expired`);
    }

    return session;
  }

  private async recommend(
    query: string,
    filters: SearchFilters,
    messages: SearchIntelligenceMessage[]
  ): Promise<SearchIntelligenceRecommendation[]> {
    const candidates = filterListings([...store.listings.values()], {
      ...filters,
      query: undefined
    }).map((result) => result.listing);
    const profiles = store.listingIntelligence;

    if (!query.trim()) {
      return candidates
        .map((listing) => {
          const scored = rankListingsForNeed(listing.category, [listing], profiles)[0];

          return {
            listingId: listing.id,
            score: Number(Math.min(100, listing.rating * 14 + listing.reviewCount / 2).toFixed(1)),
            reasons: ["popular marketplace item"],
            matchedTags: scored?.matchedTags ?? [listing.kind, listing.category, listing.location.county],
            profileSummary: profiles.get(listing.id)?.summary ?? `${listing.title}: ${listing.description}`
          };
        })
        .sort((left, right) => right.score - left.score)
        .slice(0, 15);
    }

    const localRecommendations = rankListingsForNeed(query, candidates, profiles).slice(0, 15);
    const openAiCandidates = this.searchRankingCandidates(query, candidates, localRecommendations, profiles);
    const openAiRecommendations = await this.openAiClient.rankListingsForSearch({
      query,
      filters,
      messages,
      candidates: openAiCandidates,
      limit: 15
    });

    return openAiRecommendations ?? localRecommendations;
  }

  private searchRankingCandidates(
    query: string,
    candidates: ResourceListing[],
    localRecommendations: SearchIntelligenceRecommendation[],
    profiles: Map<string, ListingIntelligenceProfile>
  ) {
    const limit = this.searchCandidateLimit();
    const localRecommendationsByListingId = new Map(localRecommendations.map((recommendation) => [recommendation.listingId, recommendation]));

    if (candidates.length <= limit) {
      return candidates.map((listing) => ({
        listing,
        profile: profiles.get(listing.id),
        localRecommendation: localRecommendationsByListingId.get(listing.id)
      }));
    }

    const selectedListingIds = new Set<string>();
    const selectedListings: ResourceListing[] = [];

    for (const recommendation of localRecommendations) {
      const listing = candidates.find((candidate) => candidate.id === recommendation.listingId);

      if (listing && !selectedListingIds.has(listing.id)) {
        selectedListingIds.add(listing.id);
        selectedListings.push(listing);
      }

      if (selectedListings.length >= limit) {
        break;
      }
    }

    for (const listing of candidates.sort((left, right) => right.rating * 100 + right.reviewCount - (left.rating * 100 + left.reviewCount))) {
      if (!selectedListingIds.has(listing.id)) {
        selectedListingIds.add(listing.id);
        selectedListings.push(listing);
      }

      if (selectedListings.length >= limit) {
        break;
      }
    }

    this.logger.log(
      `Search intelligence is sending ${selectedListings.length}/${candidates.length} filtered candidate profile(s) to OpenAI for "${query.slice(0, 80)}"`
    );

    return selectedListings.map((listing) => ({
      listing,
      profile: profiles.get(listing.id),
      localRecommendation: localRecommendationsByListingId.get(listing.id)
    }));
  }

  private createContainer(
    purpose: IntelligenceContainerRecord["purpose"],
    seed: string,
    ttlMs?: number
  ): IntelligenceContainerRecord {
    const id = this.hashId(`${purpose}:${seed}:${Date.now()}:${randomBytes(6).toString("hex")}`);
    const now = new Date();
    const container: IntelligenceContainerRecord = {
      id,
      label: `rentorbit-${purpose}-${id}`,
      purpose,
      ownerHash: this.hashId(seed),
      createdAt: now.toISOString(),
      expiresAt: ttlMs ? new Date(now.getTime() + ttlMs).toISOString() : undefined
    };

    this.containers.set(container.id, container);
    return container;
  }

  private scheduleSessionExpiry(sessionId: string) {
    const existingTimer = this.sessionTimers.get(sessionId);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      store.intelligenceSessions.delete(sessionId);
      this.sessionTimers.delete(sessionId);
      this.logger.log(`Discarded inactive search intelligence session ${sessionId}`);
    }, this.sessionTtlMs());

    timer.unref?.();
    this.sessionTimers.set(sessionId, timer);
  }

  private sessionTtlMs(): number {
    const configured = Number(this.config.get<string>("INTELLIGENCE_SESSION_TTL_MS") ?? "60000");
    return Number.isFinite(configured) && configured >= 5_000 ? configured : 60_000;
  }

  private searchCandidateLimit(): number {
    const configured = Number(this.config.get<string>("INTELLIGENCE_SEARCH_CANDIDATE_LIMIT") ?? "80");
    return Number.isFinite(configured) && configured >= 10 ? Math.floor(configured) : 80;
  }

  private randomizedDelayMs(baseDelayMs = 400): number {
    const jitter = Number.parseInt(randomBytes(2).toString("hex"), 16) % 1_800;
    return baseDelayMs + jitter;
  }

  private profileDirectory(): string {
    return this.config.get<string>("INTELLIGENCE_PROFILE_DIR") ?? join(process.cwd(), "data", "intelligence", "listings");
  }

  private async writeListingProfile(profile: ListingIntelligenceProfile) {
    const directory = this.profileDirectory();
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, `${profile.listingId}.json`), `${JSON.stringify(profile, null, 2)}\n`, "utf8");
  }

  private hashId(seed: string): string {
    return createHash("sha256").update(seed).digest("hex").slice(0, 20);
  }
}
