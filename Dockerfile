# Glama (and other registries) build this image to run MCP introspection in an isolated VM.
# Runtime still expects LAN reachability to a Divoom device when tools are invoked.
# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY resources ./resources

CMD ["node", "dist/index.js"]
