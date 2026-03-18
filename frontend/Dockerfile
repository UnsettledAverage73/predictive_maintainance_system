# Level 7: Industrial Frontend Containerization
FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm for faster builds (matches your pnpm-lock.yaml)
RUN npm install -g pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy project files
COPY . .

# Build the Next.js app
RUN pnpm run build

# Production Stage
FROM node:20-slim AS runner
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
