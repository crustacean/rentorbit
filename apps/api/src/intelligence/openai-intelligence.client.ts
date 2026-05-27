import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ListingIntelligenceProfile, ResourceListing } from "@rentorbit/shared";

type OpenAiResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

@Injectable()
export class OpenAiIntelligenceClient {
  private readonly logger = new Logger(OpenAiIntelligenceClient.name);

  constructor(private readonly config: ConfigService) {}

  async enrichListingProfile(listing: ResourceListing, baseProfile: ListingIntelligenceProfile): Promise<ListingIntelligenceProfile> {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");

    if (!apiKey) {
      return baseProfile;
    }

    const model = this.config.get<string>("OPENAI_INTELLIGENCE_MODEL") ?? "gpt-4.1-mini";
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
        })
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
    }
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
}
