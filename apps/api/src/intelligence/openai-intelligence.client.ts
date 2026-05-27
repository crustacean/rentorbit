import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  ListingIntelligenceProfile,
  ResourceListing,
  SearchFilters,
  SearchIntelligenceMessage,
  SearchIntelligenceRecommendation
} from "@rentorbit/shared";

type OpenAiResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

type SearchRankingCandidate = {
  listing: ResourceListing;
  profile?: ListingIntelligenceProfile;
  localRecommendation?: SearchIntelligenceRecommendation;
};

@Injectable()
export class OpenAiIntelligenceClient {
  private readonly logger = new Logger(OpenAiIntelligenceClient.name);

  constructor(private readonly config: ConfigService) {}

  async refineSearchNeed(input: {
    query: string;
    filters: SearchFilters;
    messages: SearchIntelligenceMessage[];
  }): Promise<string> {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    const query = input.query.trim();

    if (!apiKey || !query) {
      return query;
    }

    const model = this.config.get<string>("OPENAI_INTELLIGENCE_MODEL") ?? "gpt-4.1-mini";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.openAiTimeoutMs());

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          input: [
            {
              role: "system",
              content:
                "You are RentOrbit search intelligence. Read the ongoing session conversation JSON and return JSON only: {\"refinedNeed\":\"...\"}. Preserve the user's intent. Use tag toggle/reset payloads as preferences, not as literal product needs."
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: JSON.stringify({
                    query,
                    filters: input.filters,
                    conversation: input.messages.slice(-24)
                  })
                }
              ]
            }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        this.logger.warn(`OpenAI search refinement failed with HTTP ${response.status}`);
        return query;
      }

      const payload = (await response.json()) as OpenAiResponsePayload;
      const parsed = this.parseJsonObject(this.extractText(payload));
      return typeof parsed?.refinedNeed === "string" && parsed.refinedNeed.trim() ? parsed.refinedNeed.trim() : query;
    } catch (error) {
      this.logger.warn(`OpenAI search refinement could not run: ${error instanceof Error ? error.message : "unknown error"}`);
      return query;
    } finally {
      clearTimeout(timeout);
    }
  }

  async enrichListingProfile(listing: ResourceListing, baseProfile: ListingIntelligenceProfile): Promise<ListingIntelligenceProfile> {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");

    if (!apiKey) {
      return baseProfile;
    }

    const model = this.config.get<string>("OPENAI_INTELLIGENCE_MODEL") ?? "gpt-4.1-mini";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.openAiTimeoutMs(20_000));
    const mediaInputs = listing.media.slice(0, 8).map((media) => ({
      type: "input_image",
      image_url: media.url
    }));

    const prompt = {
      listing: {
        id: listing.id,
        kind: listing.kind,
        category: listing.category,
        subCategory: listing.subCategory,
        title: listing.title,
        description: listing.description,
        location: {
          county: listing.location.county,
          town: listing.location.town,
          generalArea: listing.location.generalArea
        },
        media: listing.media.map((media) => ({ id: media.id, url: media.url, alt: media.alt })),
        metadata: listing.metadata
      },
      requiredJsonShape: {
        summary: "short marketplace intelligence summary",
        normalizedNeedTags: ["searchable need tags"],
        visualFactors: [
          {
            mediaId: "media id",
            visibleSubject: "main subject",
            conditionMarkers: ["ageing, damage, repair, cleanliness, model clues"],
            ageMarkers: ["recent, older, year clue if visible"],
            spaceMarkers: ["tiles, walls, windows, room size, layout clues"],
            lightingMarkers: ["bright, dim, artificial, daylight"],
            riskMarkers: ["bent, broken, dirty, repaired, destroyed"],
            confidence: 0.75
          }
        ],
        condition: {
          estimatedAgeBand: "new | recent | used | older | unknown",
          modelFreshness: "current | recent | older | unknown",
          visibleWear: ["visible wear markers"],
          damageMarkers: ["damage markers"],
          repairMarkers: ["repair markers"],
          cleanlinessMarkers: ["cleanliness markers"]
        },
        spaceQuality: {
          wallCondition: ["clean walls, dirty walls, cracks, unknown"],
          windows: ["small windows, large windows, unknown"],
          lighting: ["lighting markers"],
          floorAndTileCondition: ["broken tiles, clean tiles, floor markers"]
        }
      }
    };

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          input: [
            {
              role: "system",
              content:
                "You are RentOrbit listing intelligence. Inspect listing text and images. Return compact JSON only. Do not invent exact years unless visible or strongly implied."
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: JSON.stringify(prompt)
                },
                ...mediaInputs
              ]
            }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        this.logger.warn(`OpenAI listing analysis failed with HTTP ${response.status}`);
        return baseProfile;
      }

      const payload = (await response.json()) as OpenAiResponsePayload;
      const text = this.extractText(payload);
      const parsed = this.parseJsonObject(text);

      if (!parsed) {
        this.logger.warn(`OpenAI listing analysis returned non-JSON content for ${listing.id}`);
        return baseProfile;
      }

      const parsedVisualFactors = Array.isArray(parsed.visualFactors)
        ? (parsed.visualFactors.filter((factor): factor is Record<string, unknown> => typeof factor === "object" && factor !== null) as Array<
            Record<string, unknown>
          >)
        : undefined;

      return {
        ...baseProfile,
        source: "hybrid",
        summary: typeof parsed.summary === "string" ? parsed.summary : baseProfile.summary,
        normalizedNeedTags: Array.isArray(parsed.normalizedNeedTags)
          ? [...new Set([...baseProfile.normalizedNeedTags, ...parsed.normalizedNeedTags.filter((tag): tag is string => typeof tag === "string")])]
          : baseProfile.normalizedNeedTags,
        visualFactors: parsedVisualFactors
          ? baseProfile.visualFactors.map((factor) => {
              const enriched = parsedVisualFactors.find((candidate) => candidate.mediaId === factor.mediaId);

              return enriched
                ? {
                    ...factor,
                    visibleSubject: typeof enriched.visibleSubject === "string" ? enriched.visibleSubject : factor.visibleSubject,
                    conditionMarkers: this.stringArray(enriched.conditionMarkers, factor.conditionMarkers),
                    ageMarkers: this.stringArray(enriched.ageMarkers, factor.ageMarkers),
                    spaceMarkers: this.stringArray(enriched.spaceMarkers, factor.spaceMarkers),
                    lightingMarkers: this.stringArray(enriched.lightingMarkers, factor.lightingMarkers),
                    riskMarkers: this.stringArray(enriched.riskMarkers, factor.riskMarkers),
                    confidence: typeof enriched.confidence === "number" ? enriched.confidence : factor.confidence
                  }
                : factor;
            })
          : baseProfile.visualFactors,
        condition: typeof parsed.condition === "object" && parsed.condition !== null ? { ...baseProfile.condition, ...parsed.condition } : baseProfile.condition,
        spaceQuality:
          typeof parsed.spaceQuality === "object" && parsed.spaceQuality !== null
            ? { ...baseProfile.spaceQuality, ...parsed.spaceQuality }
            : baseProfile.spaceQuality,
        raw: parsed
      };
    } catch (error) {
      this.logger.warn(`OpenAI listing analysis could not run: ${error instanceof Error ? error.message : "unknown error"}`);
      return baseProfile;
    } finally {
      clearTimeout(timeout);
    }
  }

  async rankListingsForSearch(input: {
    query: string;
    filters: SearchFilters;
    messages: SearchIntelligenceMessage[];
    candidates: SearchRankingCandidate[];
    limit?: number;
  }): Promise<SearchIntelligenceRecommendation[] | null> {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    const query = input.query.trim();

    if (!apiKey || !query || input.candidates.length === 0) {
      return null;
    }

    const model = this.config.get<string>("OPENAI_INTELLIGENCE_MODEL") ?? "gpt-4.1-mini";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.openAiTimeoutMs());
    const candidateIds = new Set(input.candidates.map((candidate) => candidate.listing.id));
    const profileByListingId = new Map(input.candidates.map((candidate) => [candidate.listing.id, candidate.profile]));
    const maxResults = Math.max(1, input.limit ?? 15);
    const candidateProfiles = input.candidates.map((candidate) => this.compactSearchCandidate(candidate));

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          temperature: 0.05,
          input: [
            {
              role: "system",
              content:
                "You are RentOrbit search ranking intelligence. Use the user's need, filters, session context, and listing intelligence profiles to choose exact listing IDs. Return compact JSON only: {\"recommendations\":[{\"listingId\":\"...\",\"score\":0-100,\"reasons\":[\"...\"],\"matchedTags\":[\"...\"]}]}. Use only candidate listing IDs. Ignore filler grammar. Prefer concrete fit: intended use, category, capacity, location, logistics, pricing, image-derived condition/space markers, and commercial signals. Do not recommend adjacent services unless the user asked for them. If no listing is relevant, return an empty recommendations array."
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: JSON.stringify({
                    query,
                    filters: input.filters,
                    maxResults,
                    conversation: input.messages.slice(-24),
                    candidates: candidateProfiles
                  })
                }
              ]
            }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        this.logger.warn(`OpenAI search ranking failed with HTTP ${response.status}`);
        return null;
      }

      const payload = (await response.json()) as OpenAiResponsePayload;
      const parsed = this.parseJsonObject(this.extractText(payload));
      const recommendations = Array.isArray(parsed?.recommendations) ? parsed.recommendations : null;

      if (!recommendations) {
        this.logger.warn("OpenAI search ranking returned JSON without a recommendations array");
        return null;
      }

      return recommendations
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => {
          const listingId = typeof item.listingId === "string" ? item.listingId : "";

          if (!candidateIds.has(listingId)) {
            return null;
          }

          const score = typeof item.score === "number" && Number.isFinite(item.score)
            ? Math.max(0, Math.min(100, item.score))
            : 0;
          const profile = profileByListingId.get(listingId);

          return {
            listingId,
            score: Number(score.toFixed(1)),
            reasons: this.stringArray(item.reasons, ["OpenAI selected this listing for the search need"]).slice(0, 6),
            matchedTags: this.stringArray(item.matchedTags, profile?.normalizedNeedTags.slice(0, 8) ?? []).slice(0, 12),
            profileSummary: profile?.summary ?? "OpenAI selected listing"
          } satisfies SearchIntelligenceRecommendation;
        })
        .filter((item): item is SearchIntelligenceRecommendation => Boolean(item))
        .filter((item) => item.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, maxResults);
    } catch (error) {
      this.logger.warn(`OpenAI search ranking could not run: ${error instanceof Error ? error.message : "unknown error"}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private compactSearchCandidate(candidate: SearchRankingCandidate) {
    const { listing, profile, localRecommendation } = candidate;

    return {
      listingId: listing.id,
      kind: listing.kind,
      category: listing.category,
      subCategory: listing.subCategory,
      title: listing.title,
      description: listing.description,
      location: {
        county: listing.location.county,
        town: listing.location.town,
        generalArea: listing.location.generalArea,
        countrywideAvailable: listing.location.countrywideAvailable,
        maxTravelRadiusKm: listing.location.maxTravelRadiusKm
      },
      logistics: {
        deliveryModes: listing.logistics.deliveryModes,
        setupTimeMinutes: listing.logistics.setupTimeMinutes,
        providesOwnTransport: listing.logistics.providesOwnTransport,
        returnRequirements: listing.logistics.returnRequirements
      },
      pricing: listing.modeRules.map((rule) => ({
        mode: rule.mode,
        label: rule.label,
        billingMetric: rule.pricing.billingMetric,
        rateKes: rule.pricing.rate.amount,
        minimumUnits: rule.pricing.minimumUnits,
        depositKes: rule.pricing.deposit?.amount,
        replacementValueKes: rule.pricing.replacementValue?.amount
      })),
      rating: listing.rating,
      reviewCount: listing.reviewCount,
      metadata: listing.metadata,
      media: listing.media.map((media) => ({
        id: media.id,
        alt: media.alt,
        isPrimary: media.isPrimary
      })),
      intelligence: profile
        ? {
            source: profile.source,
            summary: profile.summary,
            normalizedNeedTags: profile.normalizedNeedTags.slice(0, 50),
            visualFactors: profile.visualFactors.slice(0, 6).map((factor) => ({
              mediaId: factor.mediaId,
              visibleSubject: factor.visibleSubject,
              conditionMarkers: factor.conditionMarkers,
              ageMarkers: factor.ageMarkers,
              spaceMarkers: factor.spaceMarkers,
              lightingMarkers: factor.lightingMarkers,
              riskMarkers: factor.riskMarkers,
              confidence: factor.confidence
            })),
            condition: profile.condition,
            spaceQuality: profile.spaceQuality,
            commercialSignals: profile.commercialSignals
          }
        : undefined,
      localEvidence: localRecommendation
        ? {
            score: localRecommendation.score,
            reasons: localRecommendation.reasons,
            matchedTags: localRecommendation.matchedTags
          }
        : undefined
    };
  }

  private extractText(payload: OpenAiResponsePayload): string {
    if (payload.output_text) {
      return payload.output_text;
    }

    return (
      payload.output
        ?.flatMap((item) => item.content ?? [])
        .map((content) => content.text ?? "")
        .join("\n") ?? ""
    );
  }

  private parseJsonObject(text: string): Record<string, unknown> | null {
    const trimmed = text.trim();
    const withoutFence = trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const firstBrace = withoutFence.indexOf("{");
    const lastBrace = withoutFence.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      const parsed = JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1));
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  private stringArray(value: unknown, fallback: string[]): string[] {
    if (!Array.isArray(value)) {
      return fallback;
    }

    const strings = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    return strings.length > 0 ? strings : fallback;
  }

  private openAiTimeoutMs(defaultMs = 8_000): number {
    const configured = Number(this.config.get<string>("OPENAI_INTELLIGENCE_TIMEOUT_MS") ?? String(defaultMs));
    return Number.isFinite(configured) && configured >= 1_000 ? configured : defaultMs;
  }
}
