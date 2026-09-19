# Stage 1: Build the Phaser 3 game assets
FROM node:22-slim AS build
WORKDIR /app

# Prevent build-essential from hanging on prompt inputs
ENV DEBIAN_FRONTEND=noninteractive
# Restrict Node heap memory to prevent silent OOM kills
ENV NODE_OPTIONS="--max-old-space-size=2048"

ARG VITE_API_URL
ARG VITE_CDN_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CDN_URL=$VITE_CDN_URL

# Install build dependencies for native node-gyp packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Configure npm concurrency limits & force legacy peer resolution to avoid dependency lock hangs
RUN npm config set maxsockets 5 && \
    npm ci --legacy-peer-deps --no-audit --no-fund --fetch-retries=3 --fetch-retry-maxtimeout=60000

COPY . .
RUN npm run build

# Stage 2: Serve the game using NGINX
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]