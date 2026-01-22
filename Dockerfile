# Use Node.js 24 (LTS) as base image
FROM node:24-alpine AS base

# Enable corepack for Yarn 4
RUN corepack enable

# Set working directory
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
# Copy package files
COPY package.json yarn.lock ./
# Copy .yarnrc.yml to use node_modules instead of PnP
COPY .yarnrc.yml ./

# Install dependencies
RUN yarn install --immutable

# Build the application
FROM base AS builder
# Enable corepack in builder stage
RUN corepack enable
# Copy node_modules and package files from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/yarn.lock ./yarn.lock
COPY --from=deps /app/.yarnrc.yml ./.yarnrc.yml
# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN yarn build

# Production image
FROM base AS runner
ENV NODE_ENV=production

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
# Copy only production dependencies
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Start the application directly with node (no need for yarn in production)
CMD ["node", "dist/index.js"]
