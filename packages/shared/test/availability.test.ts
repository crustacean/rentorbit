import { describe, expect, it } from "vitest";
import { listingHasConflict, windowsOverlap } from "../src/availability.js";
import { seededListings } from "../src/sample-data.js";

describe("availability", () => {
  it("detects overlapping rental windows", () => {
    expect(
      windowsOverlap(
        { start: "2026-06-14T08:00:00+03:00", end: "2026-06-15T10:00:00+03:00" },
        { start: "2026-06-15T09:00:00+03:00", end: "2026-06-15T12:00:00+03:00" }
      )
    ).toBe(true);
  });

  it("does not block adjacent rental windows", () => {
    expect(
      windowsOverlap(
        { start: "2026-06-14T08:00:00+03:00", end: "2026-06-15T10:00:00+03:00" },
        { start: "2026-06-15T10:00:00+03:00", end: "2026-06-15T18:00:00+03:00" }
      )
    ).toBe(false);
  });

  it("marks a listing unavailable only for the conflicting window", () => {
    const listing = seededListings[0];
    expect(
      listingHasConflict(listing, {
        start: "2026-06-14T12:00:00+03:00",
        end: "2026-06-14T18:00:00+03:00"
      })
    ).toBe(true);
    expect(
      listingHasConflict(listing, {
        start: "2026-06-16T12:00:00+03:00",
        end: "2026-06-16T18:00:00+03:00"
      })
    ).toBe(false);
  });
});
