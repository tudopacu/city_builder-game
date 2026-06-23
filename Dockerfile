# Stage 1: Build the Phaser 3 game assets
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve the game using NGINX
FROM nginx:alpine
# Note: Most Phaser templates output to /app/dist (Vite). Change to /app/build if using Webpack.
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]