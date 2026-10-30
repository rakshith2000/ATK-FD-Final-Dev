FROM dhi.io/alpine-base:3.23-alpine3.23-dev AS build
WORKDIR /app

#For vite bundler
ENV NODE_ENV=production
ENV HUSKY=0
ENV CI=true

RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache openssl expat musl libpng zlib libxml2 nghttp2 nodejs npm
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
CMD ["sh"]