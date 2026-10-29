# Build context is the repo root (not services/dashboard), since this service depends on the
# local `database` package via `file:../../shared/database` for the Setting model (live
# credential rotation) - same pattern as services/users and services/economy.
FROM node:20-alpine AS build
WORKDIR /app

COPY shared/database ./shared/database
RUN npm install --prefix shared/database --omit=dev

COPY services/dashboard/package*.json ./services/dashboard/
RUN npm install --prefix services/dashboard

COPY services/dashboard ./services/dashboard
WORKDIR /app/services/dashboard
RUN npm run build

FROM node:20-alpine
WORKDIR /app

COPY shared/database ./shared/database
RUN npm install --prefix shared/database --omit=dev

COPY services/dashboard/package*.json ./services/dashboard/
RUN npm install --prefix services/dashboard --omit=dev

COPY services/dashboard/server ./services/dashboard/server
COPY --from=build /app/services/dashboard/client/dist ./services/dashboard/client/dist

WORKDIR /app/services/dashboard
EXPOSE 3006
CMD ["node", "server/index.js"]
