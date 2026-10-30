#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Runtime config injection for the custom FasteAI AgentGateway UI.
#
# Installed into /docker-entrypoint.d/ so the stock nginx image runs it (and then
# starts nginx) on every container start. It does NOT exec — the nginx entrypoint
# is responsible for launching nginx after all init scripts complete.
#
# The frontend reads Keycloak settings from /config.json at load time. Rather than
# baking those values into the image (which would force a rebuild per environment
# and per consuming component), we generate /config.json here from env vars, so
# the image stays a single reusable artifact.
#
# Env vars (all optional — sensible dev defaults applied):
#   KEYCLOAK_URL        Keycloak base URL       (default: FasteAI dev)
#   KEYCLOAK_REALM      Keycloak realm          (default: fasteai)
#   KEYCLOAK_CLIENT_ID  Keycloak public client  (default: fasteai)
# ─────────────────────────────────────────────────────────────────────────────
set -eu

KEYCLOAK_URL="${KEYCLOAK_URL:-https://fasteaidev.autonomousitopstoolkit.com/keycloak}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-fasteai}"
KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-fasteai}"

# keycloak-js is picky about a trailing slash on the base URL — strip it.
KEYCLOAK_URL="${KEYCLOAK_URL%/}"

CONFIG_PATH="/usr/share/nginx/html/config.json"

cat > "$CONFIG_PATH" <<EOF
{
  "keycloak": {
    "url": "${KEYCLOAK_URL}",
    "realm": "${KEYCLOAK_REALM}",
    "clientId": "${KEYCLOAK_CLIENT_ID}"
  }
}
EOF

echo "[fasteai-config] wrote ${CONFIG_PATH} (realm=${KEYCLOAK_REALM}, clientId=${KEYCLOAK_CLIENT_ID}, url=${KEYCLOAK_URL})"
