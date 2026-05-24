# RentOrbit

Countrywide Kenyan rental marketplace for goods, services, and personnel.

## What Is Implemented

- Monorepo workspace with:
  - `apps/web`: Next.js responsive PWA marketplace workspace.
  - `apps/api`: NestJS API scaffold with listings, isolated listing chats, contracts, KYC, payments, notifications, and realtime modules.
  - `packages/shared`: shared TypeScript domain rules for taxonomy, listings, availability, quote calculation, privacy-safe location search, and contract summaries.
- Countrywide all-category listing model:
  - Goods, services, and personnel.
  - Self-operated, owner-operated, and operator-only modes.
  - County/town/general-area location hierarchy.
  - Private exact coordinates plus public randomized coordinates.
  - Countrywide delivery fallback.
- Booking safety rules:
  - Time-window conflict checks.
  - Listing-specific DM threads.
  - Immutable signed contracts.
  - Void-and-amend flow for changed pickup/booking terms.
  - Payment/deposit ledger events using a Paystack-shaped adapter.
- Prisma schema for PostgreSQL/PostGIS production storage.

## Run Locally

```bash
npm install
npm run build --workspace @rentorbit/shared
npm run dev:web
```

The web app runs at `http://localhost:3000`.

To run the API scaffold:

```bash
npm run dev:api
```

The API listens on `http://localhost:4000`.

## Verification

```bash
npm test
npm run typecheck
npm run build
```

## Production Integration Notes

- Replace the in-memory API store with Prisma services backed by PostgreSQL + PostGIS.
- Wire Supabase Auth JWT verification into NestJS guards.
- Use a licensed Kenya IPRS provider before enabling listing, signing, payments, or payouts.
- Wire Paystack Kenya collection/refunds/payouts into the payment adapter.
- Treat refundable deposits as ledger-held balances until legal/accounting review confirms final escrow wording.
- Complete ODPC compliance and Kenyan legal review before processing real IDs, exact GPS data, contracts, payments, or disputes.
