# ATK — Core machine (10.106.6.15)

Runs Vault, Keycloak, Backend, Grafana, LiteLLM, Postgres and nginx.
The Frontend and Admin Console run on **10.106.6.228** — see [../ATK-Frontend/](../ATK-Frontend/).

## What this machine serves

| URL | Container | Notes |
|---|---|---|
| `https://sso-atkdev.fd.com/auth` | keycloak:8080 | `/auth` relative path kept from the single-VM setup |
| `https://vault-atkdev.fd.com` | vault:8200 | replaces the old `:8443` port on the shared DNS |
| `https://backend-atkdev.fd.com/api` | backend:8000 | FastAPI, `root_path=/api`. Swagger at `/api/docs` |
| `https://backend-atkdev.fd.com/iac_assist_socket/` | backend:8000 | WebSocket (`wss://`) |
| `https://backend-atkdev.fd.com/grafana` | grafana:3000 | no DNS of its own — sub-path of the backend host |
| `https://backend-atkdev.fd.com/litellm` | litellm:4000 | no DNS of its own — sub-path of the backend host |

Ports 80 and 443 only. **Port 8443 is gone** — Vault has a real DNS name now.

## Deploy

```bash
# 1. Copy this folder to 10.106.6.15
scp -r ATK-Core/ user@10.106.6.15:/opt/atk/

# 2. Fill in the placeholders
#    .env                     all <Placeholder> values
#    config/.keycloak_env     realm, backend client id + secret
#    config/.itsm_env         ServiceNow credentials
#    config/.vault_env        VAULT_TOKEN (after vault operator init)
#    config/litellm_config.yaml   DB user/password/name
#    config/grafana.ini       admin password
#    init/01_init.sh          keycloak + litellm DB names, users, passwords
#    docker-compose.yml       <JFrog Registry URL>/<Image>:<Tag> on 5 services

# 3. Wildcard cert
#    ssl/fullchain.pem  ssl/privkey.pem   (*.fd.com)

# 4. Up
docker compose up -d
```

### First boot — Vault

```bash
docker exec -it atk-vault vault operator init      # save the unseal keys + root token
docker exec -it atk-vault vault operator unseal    # run 3x
```

Then open `https://vault-atkdev.fd.com`, log in with the root token, and create
the LLM secret (`MODEL`, `BASE_URL`, `API_KEY`, `API_TYPE`, `AZ_API_VERSION`).
Put the root token in `config/.vault_env` and restart the backend.

### First boot — KB sync

```bash
docker exec atk-kb-sync python3 /app/modules/knowledge_assist/utils/kb_sync.py initial
```

## Keycloak client settings — the step that breaks the split deployment

The browser now sits on `https://atkdev.fd.com` while Keycloak is on
`https://sso-atkdev.fd.com`. Every token call is cross-origin, so **Web Origins
must be set** or login fails with an opaque CORS error.

In the Keycloak admin console, for **both** clients (frontend client and admin
frontend client):

| Setting | Value |
|---|---|
| Valid redirect URIs | `https://atkdev.fd.com/*` |
| Valid post logout redirect URIs | `https://atkdev.fd.com/*` |
| Web origins | `https://atkdev.fd.com` |
| Root URL / Home URL | `https://atkdev.fd.com` |

Do **not** use `+` for Web origins here — `+` means "same as the redirect URIs'
origins", which works, but listing the origin explicitly is clearer when the app
and the IdP are on different hosts.

## Why the internal URLs did not change

`config/.keycloak_env` still says `KEYCLOAK_URL=http://keycloak:8080/auth` and
`config/.vault_env` still says `VAULT_URL=http://vault:8200`. Both of those are
server-to-server calls between containers on this machine's bridge network. The
backend validates tokens through Keycloak's **introspection endpoint**, not by
checking the `iss` claim locally, so it does not care that the token says
`https://sso-atkdev.fd.com/auth/realms/...` while it asked
`http://keycloak:8080/auth`. Routing that traffic out to the public DNS and back
through nginx would only add latency and a TLS handshake.

`KEYCLOAK_REDIRECTION_URL` **did** change — it is the post-login URL handed to
the browser, so it points at `https://atkdev.fd.com`.

## Using an existing Postgres or Vault

See sections `[B]` and `[C]` in the header of `docker-compose.yml`. For `[C]`,
also delete the `vault-atkdev.fd.com` server block from `config/nginx.conf`.
