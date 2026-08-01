FROM node:22-alpine

WORKDIR /app/functions

COPY functions/package*.json ./
RUN npm ci --omit=dev

COPY functions/ ./

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
