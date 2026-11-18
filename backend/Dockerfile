FROM node:20-alpine

# Install openssl and libc6-compat for Prisma engine on Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy dependency definitions and prisma schema first for better Docker layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm install
RUN npx prisma generate

# Copy remaining source files
COPY . .

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push && npm run dev"]
