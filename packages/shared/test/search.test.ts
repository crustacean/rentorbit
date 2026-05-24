import { describe, expect, it } from "vitest";
import { filterListings, publicLocationOffset } from "../src/search.js";
import { seededListings } from "../src/sample-data.js";

describe("search", () => {
  it("supports countywide category discovery", () => {
    const results = filterListings(seededListings, {
      county: "Kisumu",
      category: "tools"
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.listing.title).toContain("Generator");
  });

  it("includes countrywide listings outside a local radius when requested", () => {
    const results = filterListings(seededListings, {
      origin: { latitude: -1.2641, longitude: 36.8028 },
      radiusKm: 10,
      category: "tools",
      includeCountrywide: true
    });

    expect(results.some((result) => result.listing.id === "lst_tools_generator_kisumu_002")).toBe(true);
  });

  it("does not expose exact owner coordinates", () => {
    const listing = seededListings[0];
    const publicCoordinates = publicLocationOffset(listing);

    expect(publicCoordinates).not.toEqual(listing.location.exactCoordinates);
  });
});
