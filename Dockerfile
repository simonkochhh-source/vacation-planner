# Multi-stage Dockerfile für Vacation Planner
# Optimiert für Development und Production Builds

# Stage 1: Development Dependencies
FROM node:18-alpine AS development
WORKDIR /app

# Installiere Dependencies
COPY package*.json ./
RUN npm ci --only=development

# Kopiere Source Code
COPY . .

# Development Command
CMD ["npm", "start"]

# Stage 2: Build Stage
FROM node:18-alpine AS build
WORKDIR /app

# Installiere alle Dependencies
COPY package*.json ./
RUN npm ci --include=dev

# Kopiere Source Code
COPY . .

# Environment Variablen für Build
ARG REACT_APP_SUPABASE_URL
ARG REACT_APP_SUPABASE_ANON_KEY
ARG REACT_APP_ENVIRONMENT=production

# Baue die Anwendung
RUN npm run build

# Stage 3: Production
FROM nginx:alpine AS production

# Kopiere Custom Nginx Config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Kopiere Build Artifacts
COPY --from=build /app/build /usr/share/nginx/html

# Expose Port
EXPOSE 80

# Health Check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]