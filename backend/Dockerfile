FROM node:18-alpine

# Required by Prisma on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN npx tsc --skipLibCheck --noEmitOnError false || true

# Make startup script executable
RUN chmod +x startup.sh

EXPOSE 3333

CMD ["sh", "startup.sh"]
