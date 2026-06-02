import { ConfigService } from "@nestjs/config";
import { buildLocalListingIntelligence, seededListings } from "@rentorbit/shared";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { OpenAiIntelligenceClient } from "./openai-intelligence.client.js";

const profileDirectory =
  process.env.INTELLIGENCE_PROFILE_DIR ?? join(process.cwd(), "data", "intelligence", "listings");
const localOnly = process.argv.includes("--local-only") || process.env.INTELLIGENCE_SEED_USE_OPENAI === "false";
const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY?.trim());
const useOpenAi = hasOpenAiKey && !localOnly;
const configuredConcurrency = Number(process.env.INTELLIGENCE_SEED_CONCURRENCY ?? "");
const concurrency = Number.isFinite(configuredConcurrency) && configuredConcurrency > 0
  ? Math.floor(configuredConcurrency)
  : useOpenAi
    ? 2
    : 8;
const openAiClient = useOpenAi ? new OpenAiIntelligenceClient(new ConfigService()) : null;

async function mapWithConcurrency<T>(items: T[], worker: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();

      if (item) {
        await worker(item);
      }
    }
  });

  await Promise.all(workers);
}

await mkdir(profileDirectory, { recursive: true });

let openAiEnrichedCount = 0;

await mapWithConcurrency(seededListings, async (listing) => {
  const localProfile = buildLocalListingIntelligence(listing);
  const profile = openAiClient
    ? await openAiClient.enrichListingProfile(listing, localProfile)
    : localProfile;

  if (profile.source === "hybrid" || profile.source === "openai") {
    openAiEnrichedCount += 1;
  }

  await writeFile(join(profileDirectory, `${listing.id}.json`), `${JSON.stringify(profile, null, 2)}\n`, "utf8");
});

const sourceMessage = useOpenAi
  ? `OpenAI enriched ${openAiEnrichedCount}/${seededListings.length} profiles`
  : hasOpenAiKey
    ? "OpenAI enrichment skipped by INTELLIGENCE_SEED_USE_OPENAI=false or --local-only"
    : "OpenAI enrichment skipped because OPENAI_API_KEY is not set";

console.log(`Mapped ${seededListings.length} seeded listings to ${profileDirectory}. ${sourceMessage}.`);
