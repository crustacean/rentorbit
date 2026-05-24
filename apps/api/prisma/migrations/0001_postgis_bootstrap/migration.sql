CREATE EXTENSION IF NOT EXISTS postgis;

-- Prisma tracks the core models. These spatial indexes must exist in production
-- so countrywide/radius discovery stays fast as listing volume grows.
CREATE INDEX IF NOT EXISTS listing_exact_location_gix
  ON "Listing"
  USING GIST ("exactLocation");

CREATE INDEX IF NOT EXISTS listing_county_category_status_idx
  ON "Listing" ("county", "categoryId", "status");
