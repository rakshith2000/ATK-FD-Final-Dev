#FROM quay.io/keycloak/keycloak:latest
#FROM quay.io/keycloak/keycloak:26.5.2
#FROM quay.io/keycloak/keycloak:26.6.0
#FROM quay.io/keycloak/keycloak:26.7.0
# FROM quay.io/keycloak/keycloak:26.7.4
FROM quay.io/keycloak/keycloak:26.8.0
#FROM quay.io/keycloak/keycloak:26.6.0

ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_PROXY=edge
ENV KC_HOSTNAME_STRICT=false
ENV KC_HTTP_ENABLED=true
ENV KC_PROXY_HEADERS=xforwarded
ENV KC_HTTP_RELATIVE_PATH=/auth

#For Keycloak theme
# COPY keycloak-themes /opt/keycloak/themes/atk-theme
COPY keycloak_themes/ /opt/keycloak/themes/

WORKDIR /opt/keycloak

# RUN /opt/keycloak/bin/kc.sh build

RUN /opt/keycloak/bin/kc.sh build --features=token-exchange


ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
