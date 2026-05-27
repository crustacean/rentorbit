# RentOrbit Architecture

RentOrbit is a countrywide Kenyan rental marketplace for goods, services, spaces, and personnel. The current implementation is a TypeScript monorepo with a Next.js PWA, NestJS API, shared domain package, Kubernetes manifests, and an intelligence layer that enriches listings and ranks search results.

## Site Relationships

```mermaid
flowchart LR
  user[User browser]
  web[Next.js PWA\napps/web]
  api[NestJS API\napps/api]
  shared[Shared domain package\npackages/shared]
  auth[Supabase Auth\nplanned external auth]
  kyc[Licensed IPRS KYC\nplanned provider]
  paystack[Paystack Kenya\nplanned payments]
  cloudinary[Cloudinary\nimage storage]
  openai[OpenAI\nlisting and search intelligence]
  db[(PostgreSQL + PostGIS\nproduction data store)]
  redis[(Redis + BullMQ\njobs and sessions)]
  socket[Socket.io\nchat and live events]

  user --> web
  web -->|REST /api rewrite| api
  web -->|Socket.io| socket
  api --> shared
  api --> socket
  api --> auth
  api --> kyc
  api --> paystack
  api --> cloudinary
  api --> openai
  api --> db
  api --> redis

  shared -->|types, taxonomy, pricing,\nsearch, contracts, intelligence helpers| web
  shared -->|types, validation,\npricing, ranking fallback| api
```

## Kubernetes Deployment Landscape

```mermaid
flowchart TB
  internet[Browser / Internet]
  ingress[Ingress Controller\nsandbox.rentorbit.local]

  subgraph ns[rentorbit namespace]
    webSvc[Service: rentorbit-web]
    apiSvc[Service: rentorbit-api]
    webDep[Deployment: rentorbit-web\nNext.js container]
    apiDep[Deployment: rentorbit-api\nNestJS container]
    cfg[ConfigMap: rentorbit-config]
    appSecret[Secret: rentorbit-secrets]
    openaiSecret[Secret: rentorbit-openai]
    rb[RBAC service account / role]
  end

  subgraph external[External services]
    openai[OpenAI API]
    pg[(PostgreSQL/PostGIS)]
    redis[(Redis)]
    cloudinary[Cloudinary]
    paystack[Paystack Kenya]
    kyc[IPRS KYC provider]
  end

  internet --> ingress
  ingress --> webSvc
  ingress --> apiSvc
  webSvc --> webDep
  apiSvc --> apiDep
  webDep --> cfg
  apiDep --> cfg
  apiDep --> appSecret
  apiDep --> openaiSecret
  apiDep --> rb
  apiDep --> openai
  apiDep --> pg
  apiDep --> redis
  apiDep --> cloudinary
  apiDep --> paystack
  apiDep --> kyc
```

## Intelligence Lifecycle

```mermaid
flowchart TB
  owner[Owner creates or edits listing]
  form[Listing form data\nkind, category, title, description,\nlocation, price, quantity, mobility]
  upload[Image upload pipeline\ncrop 5:7, compress, upload]
  cloud[Cloudinary image URLs]
  api[NestJS Listings API]
  local[Local profile builder\nfallback metadata]
  openaiListing[OpenAI listing analysis\ntext + image URLs]
  profile[(Listing intelligence profile\nJSON / DB JSONB)]
  lifecycle[Lifecycle signals\nvisits, saves, DMs, proposals,\nbookings, returns, ratings, prices]
  refresh[Queued refresh\nrebuild profile + optional OpenAI enrichment]

  search[User searches from home or marketplace]
  session[Search intelligence session\nconversation JSON + filters]
  candidates[Filtered candidate listings\ncategory/location/date/logistics]
  compact[Compact listing profile packet\nlisting data + visual factors + signals]
  openaiSearch[OpenAI search ranking\nreturns listing IDs, scores,\nreasons, matched tags]
  fallback[Local ranker fallback\nused if OpenAI is unreachable]
  ui[Marketplace results\nAI recommended listings + interactive tags]

  owner --> form --> api
  owner --> upload --> cloud --> api
  api --> local --> profile
  api --> openaiListing --> profile
  lifecycle --> refresh --> local
  refresh --> openaiListing
  profile --> compact

  search --> session
  session --> candidates
  candidates --> compact
  compact --> openaiSearch --> ui
  compact --> fallback --> ui
  ui --> lifecycle
```

## How Listing Intelligence Is Harvested

When a creator lists an item, the API stores the listing and queues intelligence analysis. The first profile is built locally so the listing remains usable even if OpenAI is unreachable. When `OPENAI_API_KEY` is configured, the API sends the listing text, metadata, and up to eight image URLs to OpenAI. OpenAI returns compact JSON with:

- searchable need tags
- visible subject per image
- age, condition, damage, repair, and cleanliness markers
- space markers such as walls, windows, tiles, lighting, yards, rooms, or halls
- commercial context such as rating and demand signals

The resulting profile is stored against the listing. In the current development app this is written under `apps/api/data/intelligence/listings`. In production this should be persisted in PostgreSQL JSONB, object storage, or a dedicated search/vector store so pods can be restarted safely.

## How Search Intelligence Works

When a user searches, the web app opens or continues a search intelligence session. The API gathers:

- the user query
- filters such as category, county, dates, radius, and delivery
- the recent session conversation
- candidate listings after hard marketplace filters
- each candidate listing's compact intelligence profile

If OpenAI is reachable, OpenAI receives that packet and returns the exact listing IDs to display, with scores, reasons, and matched tags. The UI shows those listings and exposes the matched tags as clickable AI filters. If OpenAI is missing, slow, or unreachable, RentOrbit falls back to the local ranker in `packages/shared`.

## Production Behavior

This is not limited to seeded development images. For production listings:

- uploaded images should first be normalized by the crop/compression pipeline
- final images should be stored in Cloudinary or equivalent public/private object storage
- OpenAI should receive signed or accessible image URLs during listing analysis
- the returned intelligence profile should be stored with that listing
- search should use compact stored intelligence profiles, not re-analyze images on every search
- lifecycle events should keep updating the profile as users save, message, book, return, rate, dispute, or agree on price

For large-scale production, the API should not send millions of profiles to OpenAI in one request. It should first apply hard filters and retrieval, then send a bounded candidate packet controlled by `INTELLIGENCE_SEARCH_CANDIDATE_LIMIT`. That keeps search fast, cheaper, and still grounded in real listing intelligence.

## Current Fallbacks And Guarantees

- Listing analysis falls back to local metadata if OpenAI is unavailable.
- Search ranking falls back to local ranking if OpenAI is unavailable.
- Search sessions expire after `INTELLIGENCE_SESSION_TTL_MS`.
- Candidate packet size is controlled by `INTELLIGENCE_SEARCH_CANDIDATE_LIMIT`.
- The local ranker ignores filler grammar and requires concrete listing signals, so fallback behavior remains reasonable.
