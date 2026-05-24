import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  filterListings,
  type DeliveryMode,
  type OperationMode,
  type ResourceListing,
  type SearchFilters
} from "@rentorbit/shared";
import { store } from "../common/in-memory-store.js";

type SearchQuery = Record<string, string | undefined>;

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return ["1", "true", "yes"].includes(value.toLowerCase());
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

@Injectable()
export class ListingsService {
  search(query: SearchQuery) {
    const filters: SearchFilters = {
      query: query.q,
      category: query.category,
      county: query.county,
      town: query.town,
      radiusKm: parseNumber(query.radiusKm),
      start: query.start,
      end: query.end,
      operationMode: query.operationMode as OperationMode | undefined,
      deliveryMode: query.deliveryMode as DeliveryMode | undefined,
      includeCountrywide: parseBoolean(query.includeCountrywide),
      origin:
        query.latitude && query.longitude
          ? {
              latitude: Number(query.latitude),
              longitude: Number(query.longitude)
            }
          : undefined
    };

    return filterListings([...store.listings.values()], filters);
  }

  getById(id: string): ResourceListing {
    const listing = store.listings.get(id);
    if (!listing) {
      throw new NotFoundException(`Listing ${id} was not found`);
    }
    return listing;
  }

  createListing(input: ResourceListing, userId: string): ResourceListing {
    const user = store.users.get(userId);
    if (!user || user.kycStatus !== "verified") {
      throw new BadRequestException("KYC verification is required before creating listings");
    }

    const now = new Date().toISOString();
    const listing: ResourceListing = {
      ...input,
      id: input.id || store.nextId("lst"),
      ownerId: userId,
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    store.listings.set(listing.id, listing);
    return listing;
  }
}
