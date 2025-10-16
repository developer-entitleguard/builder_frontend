# =========================
# 1. Builder stage
# =========================
FROM node:18 AS builder

# Set build-time environment
WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install dependencies (no devDependencies in production build)
#RUN npm ci --omit=dev
RUN npm install

# Copy source code
COPY . .

# For React / Next.js — run build step
# Comment out if pure Node.js backend
RUN npm run build

# =========================
# 2. Runtime stage
# =========================
FROM node:18-slim AS runtime

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

WORKDIR /app

# Copy only built app and production deps
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
#COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "run", "dev"]
