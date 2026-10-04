# Stage 1: build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: serve con Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
# Copiamo la configurazione Nginx custom che include try_files per il routing React SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80