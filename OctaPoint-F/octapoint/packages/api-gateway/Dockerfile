FROM node:20-alpine

# Prisma needs OpenSSL inside Alpine containers.
RUN apk add --no-cache openssl ca-certificates

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma
RUN npm install
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

EXPOSE 4000
CMD ["npm", "run", "dev"]
