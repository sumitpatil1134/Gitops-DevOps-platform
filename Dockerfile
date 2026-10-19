FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY app/package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node app/server.js ./server.js

USER node

EXPOSE 3000

CMD ["node", "server.js"]
