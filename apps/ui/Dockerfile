# Build stage
FROM node:22-alpine AS builder

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

WORKDIR /app

# Copy workspace config and lockfile first for better layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tsconfig.base.json tsconfig.json ./

# Copy package.json files for all workspace packages needed by ui2
COPY apps/ui2/package.json ./apps/ui2/
COPY packages/web-components/package.json ./packages/web-components/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Stub out apps/ui so the root tsconfig.json reference doesn't cause warnings
# RUN mkdir -p apps/ui && echo '{"files":[]}' > apps/ui/tsconfig.json

# Copy source for web-components dependency
COPY packages/web-components/ ./packages/web-components/

# Copy ui2 source
COPY apps/ui2/ ./apps/ui2/

# Build the app
WORKDIR /app/apps/ui2
RUN pnpm run build

# Runtime stage
FROM nginx:alpine AS runtime

# Replace default nginx config with our SPA config
COPY apps/ui2/nginx.conf /etc/nginx/conf.d/default.conf

# Copy static build output, replacing nginx's default welcome page
COPY --from=builder /app/apps/ui2/dist/client /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
