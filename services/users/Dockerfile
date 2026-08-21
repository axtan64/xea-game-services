# Build context is the repo root (not services/users), since this service depends on the
# local `database` package via `file:../../shared/database` - npm needs that directory
# present at the matching relative path, and its own postinstall (prisma generate) needs
# the real schema files, not just its package.json.
FROM node:20-alpine
WORKDIR /app

COPY shared/database ./shared/database
RUN npm install --prefix shared/database --omit=dev

COPY services/users/package*.json ./services/users/
RUN npm install --prefix services/users --omit=dev

COPY services/users ./services/users

WORKDIR /app/services/users
EXPOSE 3005
CMD ["node", "index.js"]
