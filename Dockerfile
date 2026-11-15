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

# Etapa 2: Runner de producción mínimo con Nginx sin privilegios
FROM nginx:alpine AS runner

# Configuración Nginx endurecida en puerto no privilegiado 8080 (read-only friendly)
RUN printf 'pid /tmp/nginx.pid;\n\
events {\n\
    worker_connections 1024;\n\
}\n\
http {\n\
    include /etc/nginx/mime.types;\n\
    default_type application/octet-stream;\n\
    server_tokens off;\n\
    client_body_temp_path /tmp/client_temp;\n\
    proxy_temp_path /tmp/proxy_temp_path;\n\
    fastcgi_temp_path /tmp/fastcgi_temp;\n\
    uwsgi_temp_path /tmp/uwsgi_temp;\n\
    scgi_temp_path /tmp/scgi_temp;\n\
    server {\n\
        listen 8080;\n\
        server_name _;\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        add_header Content-Security-Policy "default-src '\''self'\''; script-src '\''self'\''; style-src '\''self'\''; img-src '\''self'\'' data:; font-src '\''self'\''; connect-src '\''self'\''; object-src '\''none'\''; base-uri '\''self'\''; form-action '\''self'\''; frame-ancestors '\''none'\''" always;\n\
        add_header X-Frame-Options "DENY" always;\n\
        add_header X-Content-Type-Options "nosniff" always;\n\
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n\
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" always;\n\
        add_header Cross-Origin-Opener-Policy "same-origin" always;\n\
        add_header Cross-Origin-Resource-Policy "same-origin" always;\n\
        add_header X-Permitted-Cross-Domain-Policies "none" always;\n\
        if ($request_method !~ ^(GET|HEAD)$) {\n\
            return 405;\n\
        }\n\
        location ~ /\\. {\n\
            deny all;\n\
        }\n\
        location / {\n\
            try_files $uri $uri/ /index.html;\n\
        }\n\
    }\n\
}\n' > /etc/nginx/nginx.conf \
    && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx

# Copiar build desde la etapa anterior con dueño no privilegiado
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD nc -z 127.0.0.1 8080 || exit 1

CMD ["nginx", "-g", "daemon off;"]
