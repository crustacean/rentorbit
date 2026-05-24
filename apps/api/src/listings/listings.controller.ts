import { Body, Controller, Get, Headers, Inject, Param, Post, Query } from "@nestjs/common";
import type { ResourceListing } from "@rentorbit/shared";
import { ListingsService } from "./listings.service.js";

@Controller("listings")
export class ListingsController {
  constructor(@Inject(ListingsService) private readonly listingsService: ListingsService) {}

  @Get()
  search(@Query() query: Record<string, string | undefined>) {
    return this.listingsService.search(query);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.listingsService.getById(id);
  }

  @Post()
  create(@Body() body: ResourceListing, @Headers("x-user-id") userId = "usr_owner_asha") {
    return this.listingsService.createListing(body, userId);
  }
}
