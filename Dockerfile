FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY client ./client
COPY pq ./pq
COPY mcp ./mcp
COPY registry ./registry

ENV AQB_CHAIN=base
ENTRYPOINT ["node", "mcp/server.mjs"]
