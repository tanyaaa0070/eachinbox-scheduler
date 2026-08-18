# ──── Frontend Production Dockerfile (Nginx with Reverse Proxy) ────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Nginx static server + API proxy
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

RUN echo 'server { \
    listen 80; \
    \
    location /api/ { \
        proxy_pass http://backend:3001/api/; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $$http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $$host; \
        proxy_set_header X-Real-IP $$remote_addr; \
        proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $$scheme; \
    } \
    \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $$uri $$uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
