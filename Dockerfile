# Stage 1: Install dependencies (with native build tools for better-sqlite3)
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build the Next.js app
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY package.json next.config.mjs ./

EXPOSE 3000
# Create volume-mounted directories at startup (RUN mkdir would be hidden by bind mounts)
CMD ["sh", "-c", "mkdir -p db public/uploads/receipts public/uploads/documents && npm start"]
