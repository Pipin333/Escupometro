# syntax=docker/dockerfile:1

# Etapa 1: Builder
FROM node:22-alpine AS builder
WORKDIR /app

# Copiar manifiestos primero para aprovechar el cacheo de capas
COPY package.json package-lock.json ./
RUN npm ci

# Copiar código fuente y compilar
COPY . .
RUN npm run build

# Etapa 2: Runner de producción mínimo con Nginx
FROM nginx:alpine AS runner

# Copiar configuración personalizada de Nginx para SPA (soporte fallback index.html)
RUN printf 'server {\n\
    listen 80;\n\
    server_name localhost;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

# Copiar build desde la etapa anterior
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
