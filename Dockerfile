FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig*.json ./
COPY src ./src
COPY scripts ./scripts
COPY migrations ./migrations

RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npm run db:migrate && npm run db:migrate:up && npm run start"]
