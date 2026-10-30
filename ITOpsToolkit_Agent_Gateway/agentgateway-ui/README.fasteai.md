# Custom AgentGateway UI (reusable component)

A custom-branded fork of the AgentGateway admin UI. It is packaged as a
**self-contained Docker image** and served at the generic path **`/ui`** (no
product-specific prefix) so it can be dropped into the FasteAI stack _or_ into
any other platform that fronts an AgentGateway engine — without touching this
source.

## What is custom here

- **Branding / logos** — `public/logo*.svg`, `public/agw-*.svg`, `src/assets/agw-*.svg`.
- **Keycloak SSO + RBAC** — `src/Utilities/KeyCloak.js` (config loader) and
  `src/components/Shell.tsx` (`extractAccessMap`), which map Keycloak groups/roles
  to per-page read/write access. Groups:
  `/Admin`, `/Admin/Agent_Gateway`, `/AgentGateway`, `/AgentGateway/<page>[/write]`.
  Offline dev falls back to `src/mockKeycloakData.ts`.
- **No top header** — the UI's own top bar (breadcrumb + theme toggle) is removed
  in `Shell.tsx` so the UI embeds cleanly under a host portal that provides its
  own chrome. The left sidebar (AgentGateway sub-navigation) is kept.

## Why a custom image instead of the official one

The official `cr.agentgateway.dev/agentgateway` image bundles a **stock** admin
UI with no custom branding and no Keycloak RBAC. That image is the Rust **data
plane** and still runs as-is (see the `agentgateway` service). This image replaces
only its **UI**: the platform reverse proxy routes `/ui` here and keeps the admin
API pointed at the engine.

## The image (self-contained)

- **Base path `/ui/`** (Vite) for static assets; the app also **routes** at `/ui`.
- **Router base** is baked at build time via the `VITE_ROUTER_BASE_PATH` build
  arg (default `/ui`). It MUST match the path the app is served at or the SPA
  renders blank. Override it if you serve the UI at a different path:
  `docker build --build-arg VITE_ROUTER_BASE_PATH=/my/path --build-arg VITE_BASE_PATH=/my/path/ ...`.
- **Runtime Keycloak config** — `docker-entrypoint.sh` (installed into
  `/docker-entrypoint.d/`) writes `/config.json` from env on every start, so one
  image works everywhere with **no rebuild**:
  - `KEYCLOAK_URL` (default: FasteAI dev)
  - `KEYCLOAK_REALM` (default: `fasteai`)
  - `KEYCLOAK_CLIENT_ID` (default: `fasteai`)
- **Standalone API proxy** — when run on its own, `nginx.conf` proxies the engine
  admin API (`/config_dump`, `/api/...`, `/cel`, `/debug`) to the host:port in the
  `ENGINE_ADMIN_UPSTREAM` env var (default `fasteai-agentgateway:15000`; injected
  via envsubst at container start). Behind the platform reverse proxy those paths
  are served by the platform nginx instead, so the value is irrelevant there.

```bash
docker build -t fasteai-agentgateway-ui:latest .
docker run -p 19000:19000 \
  -e KEYCLOAK_URL=https://<host>/keycloak \
  -e KEYCLOAK_REALM=fasteai \
  -e KEYCLOAK_CLIENT_ID=fasteai \
  fasteai-agentgateway-ui:latest
# → http://localhost:19000/ui/
```

## How the FasteAI stack wires it in

- `docker-compose.yml` — service `agentgateway-ui` (image `fasteai-agentgateway-ui`),
  aliases `agentgateway-ui` / `fasteai-agentgateway-ui` on `fasteai-net`.
- root `nginx.conf` — routes `/ui/` and `/config.json` to this container (the
  `$ui_asset_backend` referrer map keeps Vault's `/ui/vault/*` + `/ui/assets`
  working). The admin API paths continue to proxy to the `agentgateway` engine.
- `Pre-requisites/deploy.sh` — writes `REACT_APP_KEYCLOAK_REALM` /
  `REACT_APP_KEYCLOAK_CLIENT_ID` to `.env`; compose maps them to `KEYCLOAK_*`.

## Reusing it in another platform (no "fasteai" anywhere)

1. Run the image (compose/k8s) with the three `KEYCLOAK_*` env vars.
2. Either let it run standalone — set `ENGINE_ADMIN_UPSTREAM=<engine-host>:15000`
   so it proxies the admin API to your engine — or put it behind your own reverse
   proxy and route `/ui/` (and `/config.json`) to port 19000, keeping the
   AgentGateway admin API (`/config_dump`, `/api/...`, `/cel`, `/debug`) pointed
   at your engine.
3. Embed `/ui` in your host portal (e.g. an iframe). The UI has no top header, so
   your portal's chrome is the only header shown.
