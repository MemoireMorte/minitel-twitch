FROM node:lts-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev


FROM node:lts-alpine
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

ENV MINITEL_WS_PORT=8080
ENV ALERT_DURATION_MS=4000
ENV ALERTS_ENABLED=true
ENV BELL_ENABLED=true

EXPOSE 8080

USER node

CMD ["node", "dist/index.js"]
