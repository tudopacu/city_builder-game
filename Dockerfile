# Stage 1: Build the Phaser game assets
FROM node:22-slim AS build
WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_OPTIONS="--max-old-space-size=2048"

ARG VITE_API_URL
ARG VITE_CDN_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CDN_URL=$VITE_CDN_URL

COPY package*.json ./

# Install packages without extra apt build tools
RUN npm config set maxsockets 5 && \
    npm ci --legacy-peer-deps --no-audit --no-fund

COPY . .
RUN npm run build

# Stage 2: Serve using NGINX
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]