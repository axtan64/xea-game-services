FROM node:20-alpine
WORKDIR /app

COPY shared/database ./shared/database
RUN npm install --prefix shared/database --omit=dev

COPY gateway/package*.json ./gateway/
RUN npm install --prefix gateway --omit=dev

COPY gateway ./gateway

WORKDIR /app/gateway
EXPOSE 3000
CMD ["node", "index.js"]