FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --fetch-retries=10 \
    --fetch-retry-factor=2 \
    --fetch-retry-mintimeout=10000 \
    --fetch-retry-maxtimeout=60000 \
    --fetch-timeout=300000

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]