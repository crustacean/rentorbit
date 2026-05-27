import { buildLocalListingIntelligence, seededListings } from "@rentorbit/shared";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const profileDirectory =
  process.env.INTELLIGENCE_PROFILE_DIR ?? join(process.cwd(), "data", "intelligence", "listings");

await mkdir(profileDirectory, { recursive: true });

await Promise.all(
  seededListings.map(async (listing) => {
    const profile = buildLocalListingIntelligence(listing);
    await writeFile(join(profileDirectory, `${listing.id}.json`), `${JSON.stringify(profile, null, 2)}\n`, "utf8");
  })
);

console.log(`Mapped ${seededListings.length} seeded listings to ${profileDirectory}`);
