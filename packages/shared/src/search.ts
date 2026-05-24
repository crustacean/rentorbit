import { availabilityState } from "./availability.js";
import type { Coordinates, DateTimeWindow, ResourceListing, SearchFilters, SearchResult } from "./types.js";

const earthRadiusKm = 6371;

function radians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function publicLocationOffset(listing: ResourceListing): Coordinates {
  const seed = Array.from(listing.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const latOffset = ((seed % 13) - 6) / 1000;
  const lonOffset = (((seed * 7) % 13) - 6) / 1000;
  return {
    latitude: Number((listing.location.exactCoordinates.latitude + latOffset).toFixed(6)),
    longitude: Number((listing.location.exactCoordinates.longitude + lonOffset).toFixed(6))
  };
}

function textMatches(listing: ResourceListing, query?: string): boolean {
  if (!query?.trim()) {
    return true;
  }
  const haystack = `${listing.title} ${listing.description} ${listing.category} ${listing.subCategory ?? ""}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function dateWindow(filters: SearchFilters): DateTimeWindow | undefined {
  return filters.start && filters.end ? { start: filters.start, end: filters.end } : undefined;
}

export function filterListings(listings: ResourceListing[], filters: SearchFilters): SearchResult[] {
  const requested = dateWindow(filters);
  const includeCountrywide = filters.includeCountrywide ?? true;

  return listings
    .map((listing) => {
      const distance = filters.origin ? distanceKm(filters.origin, listing.location.exactCoordinates) : undefined;
      return { listing, distance };
    })
    .filter(({ listing, distance }) => {
      if (listing.status !== "active") return false;
      if (!textMatches(listing, filters.query)) return false;
      if (filters.category && listing.category !== filters.category) return false;
      if (filters.county && listing.location.county !== filters.county) return false;
      if (filters.town && listing.location.town !== filters.town) return false;
      if (filters.operationMode && !listing.modeRules.some((rule) => rule.mode === filters.operationMode)) return false;
      if (filters.deliveryMode && !listing.logistics.deliveryModes.includes(filters.deliveryMode)) return false;
      if (filters.radiusKm && distance !== undefined) {
        const inRadius = distance <= filters.radiusKm;
        const reachableCountrywide = includeCountrywide && listing.location.countrywideAvailable;
        if (!inRadius && !reachableCountrywide) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.distance === undefined && b.distance === undefined) return 0;
      if (a.distance === undefined) return 1;
      if (b.distance === undefined) return -1;
      return a.distance - b.distance;
    })
    .map(({ listing, distance }) => ({
      listing,
      distanceKm: distance === undefined ? undefined : Number(distance.toFixed(1)),
      publicCoordinates: publicLocationOffset(listing),
      availabilityState: availabilityState(listing, requested)
    }));
}
