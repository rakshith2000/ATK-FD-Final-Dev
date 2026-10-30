# ATK — Frontend machine (10.106.6.228)

Runs the Frontend, the Admin Console (`/v2`) and nginx.
Everything else runs on **10.106.6.15** — see [../ATK-Core/](../ATK-Core/).

## What this machine serves

| URL | Container | Notes |
|---|---|---|
| `https://atkdev.fd.com/` | frontend:80 | React app, runtime config from `config/config.json` |
| `https://atkdev.fd.com/v2/` | admin-frontend:80 | Admin Console, static build |
| `https://atkdev.fd.com/v2/itops-mfe/itops-mfe-remote-entry.js` | admin-frontend:80 | micro-frontend the main app imports at runtime |

That is the complete list. There is **no `/api`, `/auth`, `/grafana` or
`/litellm` location here** — the browser calls those on the core machine's own
DNS names directly. No container on this machine talks to 10.106.6.15.

## Deploy

```bash
# 1. Copy this folder to 10.106.6.228
scp -r ATK-Frontend/ user@10.106.6.228:/opt/atk/

# 2. Fill in the placeholders
#    .env                  (DNS names are already filled in)
#    config/config.json    <Keycloak Realm Name>, <Frontend Keycloak Client ID>,
#                          <ServiceNow Instance URL>, <Analytics AI Base URL>
#    config/app-config.ts  <Keycloak Realm Name>, <Admin Frontend Keycloak Client ID>,
#                          <ServiceNow Instance URL>
#    config/public.pem     Keycloak realm RS256 public key
#    config/license.txt    ATK license key
#    docker-compose.yml    <JFrog Registry URL>/<Image>:<Tag> on 2 services

# 3. Wildcard cert — same *.fd.com pair as the core machine
#    ssl/fullchain.pem  ssl/privkey.pem

# 4. Up  (the admin console build takes ~5 min on first run)
docker compose up -d
```

Bring the core machine up **first**: the frontend is useless without the API,
and the admin console build does not need it but login does.

## After editing config

| File | How it is read | Action after editing |
|---|---|---|
| `config/config.json` | fetched by the browser at runtime | `docker compose restart frontend` |
| `config/app-config.ts` | compiled into the bundle | `docker compose up --force-recreate admin-frontend-builder admin-frontend` |
| `config/nginx.conf` | mounted | `docker compose restart nginx` |

## One corrected key in config.json

Everything in `config/config.json` is a mechanical hostname swap except one key:

```
before:  "meetingAssistClient": "https://<DNS Name>/meeting_assist/api/v1/"
after:   "meetingAssistClient": "https://backend-atkdev.fd.com/api/meeting_assist/api/v1/"
                                                             ^^^^
```

The old value had no `/api` segment, so under the single-DNS nginx it fell
through to the frontend catch-all `location /` and returned `index.html`
instead of JSON — it could never have reached the backend. The backend mounts
that router at `/meeting_assist` behind `root_path=/api`, so `/api` is required.

To keep the exact previous (broken) behaviour, drop the `/api` segment back out.

## Why the Admin Console lives here and not with the backend

The main frontend imports the admin console as an ES module at runtime:

```
REACT_APP_ITOPS_MFE_URL=https://atkdev.fd.com/v2/itops-mfe/itops-mfe-remote-entry.js
```

Serving it from this machine keeps it **same-origin** with the app that imports
it — no CORS preflight on the module fetch, no `Access-Control-Allow-Origin`
header to maintain, no `crossorigin` attribute needed. Moving it to the backend
host would work only after adding CORS headers to that JS file.

## Cross-origin notes

The app origin (`https://atkdev.fd.com`) is now different from the IdP
(`https://sso-atkdev.fd.com`) and the API (`https://backend-atkdev.fd.com`).

**API calls** — the backend's FastAPI `CORSMiddleware` runs with
`allow_origins=["*"]`, so cross-origin XHR works unchanged. Auth rides in the
`Authorization: Bearer` header, not cookies, so the wildcard origin is valid
here. The frontend nginx deliberately adds no CORS headers — doing so would
produce a duplicate `Access-Control-Allow-Origin` and the browser would reject
the response.

**Keycloak** — the login redirect flow is unaffected (full-page navigation to
the IdP). Set the client's **Web origins** to `https://atkdev.fd.com` or the
token exchange is blocked; see the core machine's README.

**Keycloak silent SSO** — if the frontend's keycloak-js is initialised with
`checkLoginIframe: true` (the default) it probes the session through a hidden
iframe on `sso-atkdev.fd.com`. Browsers that block third-party cookies will make
that probe fail and log the user out early. If you see unexplained logouts, set
`checkLoginIframe: false` and rely on `tokenRefreshInterval` in `config.json`,
which is already configured (300s). This was not an issue in the single-DNS
setup because Keycloak was same-origin then.

**Grafana** — `allow_embedding`, `cookie_samesite=none` and `cookie_secure` are
enabled on the core machine so the ATK Pulse / Ticket Audit links can render
Grafana in an iframe from this origin.
