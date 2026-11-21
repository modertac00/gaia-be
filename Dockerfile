FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig*.json ./
COPY src ./src
COPY scripts ./scripts
COPY migrations ./migrations
RUN npm run build && npm run build:deploy && npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3001
RUN apk add --no-cache ca-certificates curl && mkdir -p /app/certs && curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o /app/certs/rds-global-bundle.pem && addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/dist-deploy ./dist-deploy
COPY --from=build --chown=app:app /app/migrations ./migrations
COPY --from=build --chown=app:app /app/src/init/init-data.json ./src/init/init-data.json
COPY --chown=app:app deployment/runtime/entrypoint.sh /app/entrypoint.sh
USER app
EXPOSE 3001
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
CMD ["node", "dist/main.js"]
