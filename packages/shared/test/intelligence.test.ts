import { describe, expect, it } from "vitest";
import { buildLocalListingIntelligence, rankListingsForNeed } from "../src/intelligence.js";
import { seededListings } from "../src/sample-data.js";

describe("listing intelligence", () => {
  it("builds a reusable JSON profile for a listing", () => {
    const listing = seededListings.find((item) => item.id === "lst_tools_generator_kisumu_002");
    expect(listing).toBeDefined();

    const profile = buildLocalListingIntelligence(listing!);

    expect(profile.listingId).toBe(listing!.id);
    expect(profile.normalizedNeedTags).toContain("tools");
    expect(profile.visualFactors.length).toBeGreaterThan(0);
    expect(profile.commercialSignals.ratingAverage).toBe(listing!.rating);
  });

  it("ranks listings against user need text and profile markers", () => {
    const profiles = new Map(seededListings.map((listing) => [listing.id, buildLocalListingIntelligence(listing)]));
    const recommendations = rankListingsForNeed("silent generator for Kisumu site work", seededListings, profiles);

    expect(recommendations[0]?.listingId).toBe("lst_tools_generator_kisumu_002");
    expect(recommendations[0]?.score).toBeGreaterThan(0);
  });

  it("folds visits, comments, proposals, bookings, and ratings into commercial signals", () => {
    const listing = seededListings[0]!;
    const profile = buildLocalListingIntelligence(listing, [
      { type: "visit_recorded", occurredAt: "2026-05-27T10:00:00+03:00" },
      { type: "comment_added", note: "Is this available tomorrow?", occurredAt: "2026-05-27T10:01:00+03:00" },
      { type: "saved", occurredAt: "2026-05-27T10:02:00+03:00" },
      { type: "proposal_created", occurredAt: "2026-05-27T10:03:00+03:00" },
      { type: "booked", value: 1, occurredAt: "2026-05-27T10:04:00+03:00" },
      { type: "rating_added", value: 5, occurredAt: "2026-05-27T10:05:00+03:00" }
    ]);

    expect(profile.commercialSignals.visitCount).toBe(1);
    expect(profile.commercialSignals.commentCount).toBe(1);
    expect(profile.commercialSignals.savedCount).toBe(1);
    expect(profile.commercialSignals.proposalCount).toBe(1);
    expect(profile.commercialSignals.bookingCount).toBe(1);
    expect(profile.commercialSignals.ratingAverage).toBe(5);
  });
});
