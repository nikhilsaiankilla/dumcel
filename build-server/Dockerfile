FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev --no-audit --no-fund

FROM node:22-alpine

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN sed -i 's/\r$//' main.sh \
 && chmod +x main.sh script.js

ENTRYPOINT ["sh", "/app/main.sh"]