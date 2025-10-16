# ---- Stage 1: Build the app ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: Serve the built app ----
FROM node:20-alpine AS production

WORKDIR /app

# Copy only what's needed
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies (if any)
RUN npm ci --omit=dev

# Use a lightweight static server (serve or similar)
RUN npm install -g serve

EXPOSE 3000

# Serve the production build
CMD ["serve", "-s", "dist", "-l", "3000"]

