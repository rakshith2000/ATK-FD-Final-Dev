FROM nginx:alpine

RUN apk update && apk upgrade && \
    apk add --no-cache \
        openssl \
        libpng \
        tiff \
    && rm -rf /var/cache/apk/*
