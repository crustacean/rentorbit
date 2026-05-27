# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

FROM deps AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=/api
ARG API_INTERNAL_URL=http://rentorbit-api:4000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV API_INTERNAL_URL=${API_INTERNAL_URL}

COPY . .

RUN npm run build --workspace @rentorbit/shared
RUN npm run build --workspace @rentorbit/api
RUN npm run build --workspace @rentorbit/web
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS web
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@rentorbit/web"]

FROM node:22-bookworm-slim AS api
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "@rentorbit/api"]
