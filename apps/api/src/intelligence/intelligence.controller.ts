import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import type { ListingLifecycleSignal, SearchFilters } from "@rentorbit/shared";
import { IntelligenceService } from "./intelligence.service.js";

type SearchSessionBody = {
  query?: string;
  filters?: SearchFilters;
};

type SearchMessageBody = {
  message?: string;
  query?: string;
  filters?: SearchFilters;
};

type ListingSignalBody = Partial<ListingLifecycleSignal>;
type ListingCommentBody = {
  text?: string;
};
type ListingNumericBody = {
  value?: number;
  note?: string;
};

@Controller("intelligence")
export class IntelligenceController {
  constructor(@Inject(IntelligenceService) private readonly intelligenceService: IntelligenceService) {}

  @Get("listings/:id")
  getListingProfile(@Param("id") listingId: string) {
    return this.intelligenceService.getListingProfile(listingId);
  }

  @Post("listings/seeded/map")
  mapSeededListings() {
    return this.intelligenceService.mapSeededListings();
  }

  @Post("listings/:id/analyze")
  analyzeListing(@Param("id") listingId: string, @Headers("x-user-id") userId = "system") {
    return this.intelligenceService.analyzeListingNow(listingId, userId);
  }

  @Post("listings/:id/signals")
  recordListingSignal(@Param("id") listingId: string, @Body() body: ListingSignalBody) {
    return this.intelligenceService.recordListingSignal(listingId, {
      type: body.type ?? "rating_added",
      value: body.value,
      note: body.note,
      occurredAt: body.occurredAt ?? new Date().toISOString()
    });
  }

  @Post("listings/:id/visits")
  recordListingVisit(@Param("id") listingId: string) {
    return this.intelligenceService.recordListingSignal(listingId, {
      type: "visit_recorded",
      occurredAt: new Date().toISOString()
    });
  }

  @Post("listings/:id/comments")
  recordListingComment(@Param("id") listingId: string, @Body() body: ListingCommentBody) {
    return this.intelligenceService.recordListingSignal(listingId, {
      type: "comment_added",
      note: body.text,
      occurredAt: new Date().toISOString()
    });
  }

  @Post("listings/:id/bookings")
  recordListingBooking(@Param("id") listingId: string, @Body() body: ListingNumericBody) {
    return this.intelligenceService.recordListingSignal(listingId, {
      type: "booked",
      value: body.value,
      note: body.note,
      occurredAt: new Date().toISOString()
    });
  }

  @Post("listings/:id/ratings")
  recordListingRating(@Param("id") listingId: string, @Body() body: ListingNumericBody) {
    return this.intelligenceService.recordListingSignal(listingId, {
      type: "rating_added",
      value: body.value,
      note: body.note,
      occurredAt: new Date().toISOString()
    });
  }

  @Post("search/sessions")
  startSearchSession(@Body() body: SearchSessionBody, @Headers("x-user-id") userId?: string) {
    return this.intelligenceService.startSearchSession({
      query: body.query,
      filters: body.filters,
      userId
    });
  }

  @Get("search/sessions/:id")
  getSearchSession(@Param("id") sessionId: string) {
    return this.intelligenceService.getSearchSession(sessionId);
  }

  @Post("search/sessions/:id/messages")
  continueSearchSession(@Param("id") sessionId: string, @Body() body: SearchMessageBody) {
    return this.intelligenceService.continueSearchSession(sessionId, {
      message: body.message?.trim() || "Help me find a better match.",
      query: body.query,
      filters: body.filters
    });
  }
}
