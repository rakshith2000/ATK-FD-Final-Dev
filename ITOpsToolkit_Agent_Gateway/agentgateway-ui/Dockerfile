FROM node:22-alpine AS build
RUN apk update && apk upgrade --no-cache
WORKDIR /app

ENV CI=true

ARG VITE_ROUTER_BASE_PATH=/ui
ENV VITE_ROUTER_BASE_PATH=${VITE_ROUTER_BASE_PATH}
COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
RUN apk update && apk upgrade --no-cache
ENV ENGINE_ADMIN_UPSTREAM=fasteai-agentgateway:15000
ENV NGINX_ENVSUBST_FILTER=ENGINE_

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/out /usr/share/nginx/html/ui

COPY docker-entrypoint.sh /docker-entrypoint.d/99-fasteai-config.sh
RUN chmod +x /docker-entrypoint.d/99-fasteai-config.sh

EXPOSE 19000
CMD ["nginx", "-g", "daemon off;"]
