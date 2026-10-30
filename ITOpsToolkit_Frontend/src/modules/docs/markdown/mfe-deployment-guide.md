# ITOps Toolkit - Micro Frontend Deployment Guide (DevOps)

Two apps are deployed together to form the full ITOps Toolkit frontend:

| App                                     | Git Branch                                      | Role                                                       | Build tool (Bundler) | Build Output (Bundle)                          |
| --------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------- | -------------------- | ---------------------------------------------- |
| **ITOpsToolkit_Frontend** (Host)        | `IPR001380_ITOpsToolkit/itops-mfe-bridge-setup` | Legacy React 18 app, serves the main UI                    | CRA (Webpack)        | `build/`                                       |
| **itops-toolkit-frontend** (Remote/MFE) | `ITOps_Toolkit_Frontend_Revamp/master`          | New React 19 micro-frontend, loaded by the host at runtime | Vite                 | `dist/` (SPA) + `dist/itops-mfe/` (MFE bundle) |

The host loads the remote's `itops-mfe-remote-entry.js` as an ES module at runtime via a `<script type="module">` tag. There is no compile-time dependency between the two.

---

## 1. Prerequisites

- **Node.js** >= 20 (LTS recommended)
- **npm** >= 10
- **Nginx** >= 1.25

---

## 2. Environment Variables

### Remote App (itops-toolkit-frontend)

| Variable                     | Purpose                                                   | Example      |
| ---------------------------- | --------------------------------------------------------- | ------------ |
| `VITE_APP_PIPELINE_STAGE`    | Build stage identifier                                    | `production` |
| `VITE_APP_BASE_PATH`         | Base path for the SPA routing for deployment in a subpath | `/v2/`       |
| `VITE_ENABLE_DOCS_PAGE`      | Enable or disable the `/docs` page                        | `false`      |
| `VITE_ENABLE_DEV_SPACE_PAGE` | Enable or disable dev-space page (`/dev-temp-space`)      | `false`      |

Set in a `.env` file at the project root or pass via CI environment.

### Host App (ITOpsToolkit_Frontend)

| Variable                  | Purpose                         | Example                                                          |
| ------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| `REACT_APP_ITOPS_MFE_URL` | URL to the remote entry JS file | `https://app.example.com/v2/itops-mfe/itops-mfe-remote-entry.js` |

The host also reads `public/config.json` at runtime for Keycloak SSO settings. Update this file per environment:

```jsonc
{
    "keycloak": {
        "url": "https://sso.example.com/",
        "realm": "AIOT",
        "clientId": "Check-AIOT",
    },
}
```

### Husky / Git Hooks (CI only)

In CI pipelines, disable Husky git hooks to avoid failures on machines without a `.git` directory or where hooks are irrelevant:

```bash
export NODE_ENV=production  # ensures production optimizations in build and resticts any source-map generation
export HUSKY=0        # disables Husky in npm install
export CI=true        # standard CI flag, also suppresses interactive prompts
```

Set these **before** running `npm ci`.

---

## 3. Build Commands

### Remote App (itops-toolkit-frontend)

```bash
cd itops-toolkit-frontend

# Install dependencies
npm ci --include=dev      # use ci (not install) for production builds

# Build everything (SPA + MFE + type-check)
npm run build

```

**Output:**

```bash
dist/
  index.html                          # SPA entry
  assets/                             # SPA assets
  itops-mfe/
    itops-mfe-remote-entry.js         # MFE entry (loaded by host)
    assets/
      itops-mfe-styles.css            # component CSS
    chunks/
      *.js                            # code-split vendor chunks
```

### Host App (ITOpsToolkit_Frontend)

```bash

export NODE_ENV=production  # ensures production optimizations in build and resticts any source-map generation

cd ITOpsToolkit_Frontend

# Install dependencies
npm ci

# Build
npm run build
```

**Output:**

```
build/
  index.html
  static/
    css/
    js/
    media/
```

---

## 4. Deployment Option A - Single Server (Subpath-Based)

Both apps served by one Nginx instance. The host is at `/`, the remote SPA at `/v2/`, and the MFE assets at `/v2/itops-mfe/`.

### Directory layout on server

```
/var/www/itops/
  host/                           # contents of ITOpsToolkit_Frontend/build/
    index.html
    static/
  remote/                         # contents of itops-toolkit-frontend/dist/
    index.html
    assets/
    itops-mfe/
      itops-mfe-remote-entry.js
      assets/
      chunks/
```

### Nginx config

```nginx
server {
    listen 80;
    server_name app.example.com;

    # --- Host App (root) ---
    root /var/www/itops/host;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # --- Remote SPA (/v2/) ---
    location /v2/ {
        alias /var/www/itops/remote/;
        try_files $uri $uri/ /v2/index.html;
    }

    # --- MFE Remote Entry (short cache, must revalidate) ---
    location = /v2/itops-mfe/itops-mfe-remote-entry.js {
        alias /var/www/itops/remote/itops-mfe/itops-mfe-remote-entry.js;
        expires 5m;
        add_header Cache-Control "public, must-revalidate" always;
    }

    # --- MFE Chunks (immutable, long cache) ---
    location /v2/itops-mfe/chunks/ {
        alias /var/www/itops/remote/itops-mfe/chunks/;
        expires 1y;
        add_header Cache-Control "public, immutable" always;
    }

    # --- MFE Assets (immutable, long cache) ---
    location /v2/itops-mfe/assets/ {
        alias /var/www/itops/remote/itops-mfe/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable" always;
    }

    # --- Gzip ---
    gzip on;
    gzip_types text/css application/javascript application/json text/plain;
    gzip_min_length 256;
}
```

Since both apps are on the same origin, **no CORS headers are needed**.

Set the host env var to a same-origin path:

```
REACT_APP_ITOPS_MFE_URL=/v2/itops-mfe/itops-mfe-remote-entry.js
```

---

## 5. Deployment Option B - Separate Servers (CORS Required)

Each app runs on its own server/domain. The host loads the remote entry cross-origin.

### Host server Nginx

```nginx
server {
    listen 80;
    server_name host.example.com;

    root /var/www/itops-host;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/css application/javascript application/json;
}
```

### Remote server Nginx (with CORS)

```nginx
server {
    listen 80;
    server_name remote.example.com;

    root /var/www/itops-remote;
    index index.html;

    # --- CORS headers for all MFE assets ---
    # Replace host.example.com with the actual host origin.
    # Use * only for development; restrict in production.

    location /v2/ {
        alias /var/www/itops-remote/;
        try_files $uri $uri/ /v2/index.html;
    }

    location = /v2/itops-mfe/itops-mfe-remote-entry.js {
        alias /var/www/itops-remote/itops-mfe/itops-mfe-remote-entry.js;
        expires 5m;
        add_header Cache-Control "public, must-revalidate" always;

        # CORS
        add_header Access-Control-Allow-Origin "https://host.example.com" always;
        add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, Content-Type, Accept" always;

        if ($request_method = OPTIONS) {
            return 204;
        }
    }

    location /v2/itops-mfe/chunks/ {
        alias /var/www/itops-remote/itops-mfe/chunks/;
        expires 1y;
        add_header Cache-Control "public, immutable" always;

        # CORS
        add_header Access-Control-Allow-Origin "https://host.example.com" always;
        add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
    }

    location /v2/itops-mfe/assets/ {
        alias /var/www/itops-remote/itops-mfe/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable" always;

        # CORS
        add_header Access-Control-Allow-Origin "https://host.example.com" always;
        add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
    }

    gzip on;
    gzip_types text/css application/javascript application/json;
}
```

Set the host env var to the remote's full URL:

```
REACT_APP_ITOPS_MFE_URL=https://remote.example.com/v2/itops-mfe/itops-mfe-remote-entry.js
```

### CORS notes

- The remote entry is an ES module (`<script type="module">`). Module scripts are CORS-enabled by default -- the browser **will** enforce CORS if origins differ.
- The remote entry dynamically imports chunks via relative paths. If the entry is loaded cross-origin, the chunks inherit that origin and also need CORS headers.
- `Access-Control-Allow-Origin: *` works but restrict to the host origin in production.
- For Keycloak SSO (`check-sso`), the Keycloak server's CORS config must also allow the host origin in its Web Origins setting.

---

## 6. HTTPS / TLS

For production, add TLS in front of both options. Minimal addition to any server block:

```nginx
server {
    listen 443 ssl;
    server_name app.example.com;

    ssl_certificate     /etc/ssl/certs/app.example.com.pem;
    ssl_certificate_key /etc/ssl/private/app.example.com.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # ... rest of config unchanged ...
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$host$request_uri;
}
```

---

## 7. CI Pipeline Reference

A typical CI pipeline for both apps:

```yaml
# Example

env:
    NODE_ENV: 'production' # ensures production optimizations in build and restricts any source-map generation
    HUSKY: '0' # skip git hooks in CI
    CI: 'true'

steps:
    # --- Remote App ---
    - name: Build Remote
      working-directory: itops-toolkit-frontend
      run: |
          npm ci
          npm run build
      env:
          VITE_APP_PIPELINE_STAGE: production
          VITE_APP_BASE_PATH: /v2/
          VITE_ENABLE_DOCS_PAGE: 'false'
          VITE_ENABLE_DEV_SPACE_PAGE: 'false'

    # --- Host App ---
    - name: Build Host
      working-directory: ITOpsToolkit_Frontend
      run: |
          npm ci
          npm run build
      env:
          REACT_APP_ITOPS_MFE_URL: /v2/itops-mfe/itops-mfe-remote-entry.js
```

## 11. Quick Checklist

- [x] Node LTS installed
- [x] `HUSKY=0` set in CI environment
- [x] `npm ci` used (not `npm install`)
- [x] Remote: `VITE_APP_BASE_PATH` matches Nginx subpath
- [x] Host: `REACT_APP_ITOPS_MFE_URL` points to the correct remote entry URL
- [x] Host: `public/config.json` has correct Keycloak URL/realm/clientId for the target environment
- [x] Nginx serves `itops-mfe-remote-entry.js` with correct CORS headers (if cross-origin)
- [x] Nginx serves `itops-mfe-remote-entry.js` with short cache (5m)
- [x] Nginx serves chunks/assets with long cache (1y, immutable)
- [x] `<script type="module">` is used (not plain `<script>`) -- required for ES module loading
- [x] TLS configured for production
- [x] Gzip enabled for JS, CSS, JSON
