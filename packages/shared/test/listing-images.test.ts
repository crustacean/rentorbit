import { describe, expect, it } from "vitest";
import { listingImageCompressionDefaults, normalizeListingImageUrl } from "../src/index.js";
import { seededListings } from "../src/sample-data.js";

describe("listing image preparation", () => {
  it("normalizes Unsplash media URLs to a 5:7 compressed crop", () => {
    const normalized = normalizeListingImageUrl(
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80"
    );
    const url = new URL(normalized);

    expect(url.searchParams.get("fit")).toBe("crop");
    expect(url.searchParams.get("w")).toBe(String(listingImageCompressionDefaults.width));
    expect(url.searchParams.get("h")).toBe(String(listingImageCompressionDefaults.height));
    expect(url.searchParams.get("q")).toBe(String(listingImageCompressionDefaults.quality));
    expect(Number(url.searchParams.get("w")) / Number(url.searchParams.get("h"))).toBeCloseTo(5 / 7, 3);
  });

  it("passes all seeded listing media through the 5:7 crop and compression profile", () => {
    const mediaItems = seededListings.flatMap((listing) => listing.media);

    expect(mediaItems.length).toBeGreaterThan(0);

    for (const media of mediaItems) {
      const url = new URL(media.url);
      expect(url.searchParams.get("fit")).toBe("crop");
      expect(url.searchParams.get("w")).toBe(String(listingImageCompressionDefaults.width));
      expect(url.searchParams.get("h")).toBe(String(listingImageCompressionDefaults.height));
      expect(url.searchParams.get("q")).toBe(String(listingImageCompressionDefaults.quality));
      expect(Number(url.searchParams.get("w")) / Number(url.searchParams.get("h"))).toBeCloseTo(5 / 7, 3);
    }
  });
});
