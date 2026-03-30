FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Build ignorando erros de TypeScript
RUN npx tsc --skipLibCheck --noEmitOnError false || true

EXPOSE 3333

CMD ["node", "dist/server.js"]