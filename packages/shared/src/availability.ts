import type { DateTimeWindow, ResourceListing } from "./types.js";

export function toTime(value: string): number {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ISO date-time: ${value}`);
  }
  return parsed;
}

export function assertValidWindow(window: DateTimeWindow): void {
  if (toTime(window.start) >= toTime(window.end)) {
    throw new Error("Booking start must be before booking end");
  }
}

export function windowsOverlap(a: DateTimeWindow, b: DateTimeWindow): boolean {
  assertValidWindow(a);
  assertValidWindow(b);
  return toTime(a.start) < toTime(b.end) && toTime(b.start) < toTime(a.end);
}

export function listingHasConflict(listing: ResourceListing, requested?: DateTimeWindow): boolean {
  if (!requested) {
    return false;
  }
  return listing.unavailableWindows.some((blocked) => windowsOverlap(blocked, requested));
}

export function availabilityState(listing: ResourceListing, requested?: DateTimeWindow): "available" | "unavailable_for_window" {
  return listingHasConflict(listing, requested) ? "unavailable_for_window" : "available";
}
