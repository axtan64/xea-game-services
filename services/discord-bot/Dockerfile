# Build context is the repo root (not services/discord-bot), since this service depends on the
# local `database` package via `file:../../shared/database` for the live-rotatable
# ROBLOX_BOT_COOKIE setting - see lib/credentials.js.
# Debian-based (not -alpine): @xenova/transformers' onnxruntime-node ships a prebuilt binary
# linked against glibc, which Alpine's musl libc can't load (ERR_DLOPEN_FAILED: missing
# ld-linux-x86-64.so.2) - no reliable Alpine-side fix for that, so we need a glibc base here.
FROM node:20-slim
WORKDIR /app

# better-sqlite3 (chat memory store) is a native module - needs a C++ toolchain + Python to build from source
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY shared/database ./shared/database
RUN npm install --prefix shared/database --omit=dev

COPY services/discord-bot/package*.json ./services/discord-bot/
RUN npm install --prefix services/discord-bot --omit=dev

COPY services/discord-bot ./services/discord-bot

WORKDIR /app/services/discord-bot
EXPOSE 3002
CMD ["node", "index.js"]
