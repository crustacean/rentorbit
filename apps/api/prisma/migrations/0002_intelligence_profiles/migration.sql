CREATE TABLE IF NOT EXISTS "ListingIntelligenceProfile" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'local_heuristic',
  "profile" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ListingIntelligenceProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IntelligenceSearchSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "sessionHash" TEXT NOT NULL,
  "filters" JSONB NOT NULL,
  "conversation" JSONB NOT NULL,
  "recommendations" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntelligenceSearchSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ListingIntelligenceProfile_listingId_key"
  ON "ListingIntelligenceProfile" ("listingId");

CREATE INDEX IF NOT EXISTS "ListingIntelligenceProfile_generatedAt_idx"
  ON "ListingIntelligenceProfile" ("generatedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "IntelligenceSearchSession_sessionHash_key"
  ON "IntelligenceSearchSession" ("sessionHash");

CREATE INDEX IF NOT EXISTS "IntelligenceSearchSession_userId_createdAt_idx"
  ON "IntelligenceSearchSession" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "IntelligenceSearchSession_expiresAt_idx"
  ON "IntelligenceSearchSession" ("expiresAt");

ALTER TABLE "ListingIntelligenceProfile"
  ADD CONSTRAINT "ListingIntelligenceProfile_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntelligenceSearchSession"
  ADD CONSTRAINT "IntelligenceSearchSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
