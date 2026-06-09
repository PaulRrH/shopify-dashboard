# ── Stage 1: Build Angular ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# ── Stage 2: Production server ─────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js .
COPY --from=builder /app/dist ./dist

EXPOSE 8080
CMD ["node", "server.js"]
