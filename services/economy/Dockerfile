# Build context is the repo root (not services/economy), since this service depends on the
# local `database` package via `file:../../shared/database` - npm needs that directory
# present at the matching relative path, and its own postinstall (prisma generate) needs
# the real schema files, not just its package.json.
FROM node:20-alpine
WORKDIR /app

COPY shared/database ./shared/database
RUN npm install --prefix shared/database --omit=dev

COPY services/economy/package*.json ./services/economy/
RUN npm install --prefix services/economy --omit=dev

COPY services/economy ./services/economy

WORKDIR /app/services/economy
EXPOSE 3003
CMD ["node", "index.js"]
