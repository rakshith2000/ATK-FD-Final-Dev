# ITOps Toolkit — Micro Frontend (MFE) Guide

## Architecture Overview

```
  Host App (any framework)
    <itops-mfe> Web Component
      #itops-mfe-root (Shadow DOM host)
       #shadow-root (open)
        adoptedStyleSheets [Tailwind+brand]
        <link> component CSS modules
        <div> Emotion/MUI styles
        <div #itops-mfe-render-root>
          React 19 Tree (isolated)
          - TanStack Router (memory)
          - Pluggable Auth
          - TanStack Query
          - MUI + Tailwind
          - Portals (inside shadow root)
          - Error Boundaries
          - Global Alerts/Toasts
```

**Key principles:**

1. **Shadow DOM isolation** — The MFE renders inside a shadow root (`mode: 'open'`). Host CSS cannot reach in, MFE CSS cannot leak out. No `!important` hacks, no selector
   prefixing, no specificity wars.
2. **Isolated React trees** — The MFE bundles its own React 19. The host can use React 18, Angular, Vue, or anything else. They never share a React instance.
3. **Memory history routing** — The MFE uses TanStack Router with `createMemoryHistory`. It never touches `window.location`. Navigation is communicated to the host via the
   `mfe-navigate` event.
4. **Pluggable auth** — The MFE supports three auth modes: Keycloak (`check-sso`), Entra ID (`ssoSilent`), or raw Token (JWT). The host owns authentication — the MFE never calls
   login/logout.
5. **Portal containment** — All React portals (MUI dialogs, dropdowns, tooltips, custom modals) render inside the shadow root, not `document.body`.
6. **Error boundaries** — Both a top-level `ErrorBoundary` (around the entire MFE app) and per-route error components catch and display errors gracefully.
7. **Non-blocking auth** — Auth initialization happens in parallel with rendering. Users see a loading indicator immediately, not a blank page.

---

## How It Works End-to-End

### 1. Build

```bash
npm run build
```

This runs three steps:

1. `vite build` — Builds the standalone SPA into `dist/`
2. `vite build --config vite.config.itops-mfe.ts` — Builds the MFE library into `dist/itops-mfe/`
3. `tsc` — Type-checks the project

The MFE build produces:

- `dist/itops-mfe/itops-mfe-remote-entry.js` — ESM entry point, exports `mountItopsMfeRoute` and registers `<itops-mfe>`. Includes Tailwind + brand CSS inline (applied to shadow
  DOM via `adoptedStyleSheets`).
- `dist/itops-mfe/assets/itops-mfe-styles.css` — Component-level CSS modules only (StatusBadge, etc.). Main Tailwind/brand CSS is embedded in the JS entry.
- `dist/itops-mfe/chunks/*.js` — Code-split vendor chunks (lazy-loaded)

### 2. Load

The host loads `itops-mfe-remote-entry.js` as an ES module:

```html
<script type="module" src="https://your-app.com/itops-mfe/itops-mfe-remote-entry.js"></script>
```

This auto-registers the `<itops-mfe>` custom element and exports `mountItopsMfeRoute` for programmatic use.

### 3. Mount

The `<itops-mfe>` element (or `mountItopsMfeRoute`) does the following on mount:

1. Injects Google Fonts into `document.head` (fonts must be in light DOM)
2. Creates `<div id="itops-mfe-root">` and attaches a **shadow root** (`mode: 'open'`)
3. Hoists `@property` rules from the CSS to `document.adoptedStyleSheets` (Tailwind v4 needs them document-global)
4. Applies the shared `CSSStyleSheet` to `shadowRoot.adoptedStyleSheets` — Tailwind + brand CSS, instant, no FOUC
5. Attaches component CSS modules (dev: moves `<style>` from `<head>`; prod: `<link>` to extracted CSS)
6. Creates `<div id="itops-mfe-render-root">` inside the shadow root as React's render target
7. Creates the auth provider and starts initialization **without blocking rendering**
8. Renders `AuthGate` immediately (shows loading indicator while auth initializes)
9. Once auth completes, renders the full `ItopsMfeApp` tree

### 4. Unmount

On unmount (or when the custom element is removed from DOM):

1. `root.unmount()` tears down the React tree
2. `mfeAuthProvider.destroy()` clears auth refresh timers
3. Component CSS `<style>` tags are restored to `<head>` (dev mode); `<link>` removed (production)
4. Hoisted `@property` sheet is removed from `document.adoptedStyleSheets`
5. Font `<link>` is removed from `document.head`
6. Shadow host element is removed from the DOM

---

## File Reference

| File                                                                              | Purpose                                                                                                                                                                         |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/itops-mfe/index.ts`                                                          | Entry point. Exports `mountItopsMfeRoute`, `ITOpsMFEElement`, auth providers, and types.                                                                                        |
| `src/itops-mfe/types.ts`                                                          | TypeScript interfaces: `MFEAuthConfig`, `MFEMountOptions`, `MFEInstance`, auth config types.                                                                                    |
| `src/itops-mfe/mountItopsMfeRoute.tsx`                                            | Core mount function. Creates shadow DOM, applies styles via `adoptedStyleSheets`, hoists `@property`, inits auth (non-blocking), creates React root. Exports `getShadowRoot()`. |
| `src/itops-mfe/itops-mfe-element.ts`                                              | `<itops-mfe>` Web Component. Framework-agnostic wrapper around `mountItopsMfeRoute`. Events use `composed: true` to cross shadow boundary.                                      |
| `src/itops-mfe/ItopsMfeApp.tsx`                                                   | Root React component. Composes all providers, router, and global components.                                                                                                    |
| `src/itops-mfe/itops-mfe-routes.tsx`                                              | TanStack Router route tree with memory history, error/404/pending defaults. `defaultPendingMs: 500` prevents flash-of-loading.                                                  |
| `src/itops-mfe/ItopsMfeKeycloakAuthProvider.ts`                                   | Keycloak auth provider using `check-sso` (never `login-required`).                                                                                                              |
| `src/itops-mfe/ItopsMfeEntraIdAuthProvider.ts`                                    | Entra ID (Azure AD) auth provider using `ssoSilent`.                                                                                                                            |
| `src/itops-mfe/ItopsMfeTokenAuthProvider.ts`                                      | Raw JWT token auth provider with `updateToken()` support.                                                                                                                       |
| `src/itops-mfe/ItopsMfePortalProvider.tsx`                                        | Context that provides the shadow root render container as the portal target.                                                                                                    |
| `src/itops-mfe/ItopsMfeMuiThemeProvider.tsx`                                      | MUI theme with Emotion cache injecting into shadow root.                                                                                                                        |
| `src/itops-mfe/itops-mfe-styles.css`                                              | Imports `index.css` (Tailwind + brand tokens) and adds shadow DOM overrides (`:host`, render root reset). Imported with `?inline` by mount code.                                |
| `vite.config.itops-mfe.ts`                                                        | Vite library-mode build config for the MFE.                                                                                                                                     |
| `src/shared/utils/get-portal-container.ts`                                        | Returns render root inside shadow DOM if available, else `document.body`.                                                                                                       |
| `src/shared/hooks/useClickOutside.ts`                                             | Shadow DOM–safe click-outside hook using `composedPath()`. Used by all dropdown/popover components.                                                                             |
| `src/shared/components/smart/RichTextEditor/plugins/ShadowDomSelectionPlugin.tsx` | Bridges Lexical editor selection handling inside Shadow DOM using `getComposedRanges()`.                                                                                        |

---

## Build System

### `vite.config.itops-mfe.ts`

The MFE uses Vite's **library mode** (not Module Federation). Key settings:

```ts
build: {
    outDir: 'dist/itops-mfe',
    emptyOutDir: false,
    cssMinify: false,
    lib: {
        entry: './src/itops-mfe/index.ts',
        formats: ['es'],
        fileName: () => 'itops-mfe-remote-entry.js',
    },
    rolldownOptions: {
        output: {
            codeSplitting: true,
            manualChunks: (id) => {
                // Splits vendor deps into separate chunks
                // (vendor-react, vendor-router, vendor-mui-core, etc.)
            },
        },
    },
}
```

**CSS pipeline:** Since shadow DOM provides complete style isolation, the build config only needs `autoprefixer`. No `postcss-prefix-selector` or `@layer` unwrapping required.

### npm scripts

| Script              | What it does                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run build`     | Full build: SPA + MFE + type-check (`vite build && vite build --config vite.config.itops-mfe.ts && tsc`) |
| `npm run build:mfe` | MFE build only                                                                                           |
| `npm run dev`       | Standalone dev server                                                                                    |
| `npm run dev:mfe`   | Build MFE then serve via `vite preview` on port 3000                                                     |

---

## Consuming the MFE

> **No changes required in the host app.** The shadow DOM is an internal implementation detail of the MFE. The host still creates `<itops-mfe>`, sets `authConfig`, and listens to
> events exactly as before.

### Plain HTML / Vanilla JS

**Auth config is passed via JS property (`authConfig`) — never as DOM attributes.** This prevents credentials, tokens, and client IDs from being visible in the DOM inspector.

```html
<!DOCTYPE html>
<html>
    <head>
        <script type="module" src="https://your-app.com/itops-mfe/itops-mfe-remote-entry.js"></script>
    </head>
    <body>
        <itops-mfe initial-path="/itops/incident-ai"></itops-mfe>

        <script>
            const mfe = document.querySelector('itops-mfe');

            // Auth config via JS property — NOT visible in DOM
            mfe.authConfig = {
                type: 'keycloak',
                config: {
                    url: 'https://sso.example.com/',
                    realm: 'AIOT',
                    clientId: 'Check-AIOT',
                },
            };

            mfe.addEventListener('mfe-navigate', (e) => {
                console.log('MFE navigated to:', e.detail.path);
            });

            mfe.addEventListener('mfe-session-expired', () => {
                window.location.href = '/login';
            });

            mfe.addEventListener('mfe-mounted', () => {
                console.log('MFE is ready');
            });

            mfe.addEventListener('mfe-error', (e) => {
                console.error('MFE failed:', e.detail.error);
            });
        </script>
    </body>
</html>
```

### Programmatic (Vanilla JS)

```js
import { mountItopsMfeRoute } from 'https://your-app.com/itops-mfe/itops-mfe-remote-entry.js';

const container = document.getElementById('app');

const instance = await mountItopsMfeRoute(container, {
    auth: {
        type: 'keycloak',
        config: {
            url: 'https://sso.example.com/',
            realm: 'AIOT',
            clientId: 'Check-AIOT',
        },
    },
    initialPath: '/itops/incident-ai',
    onNavigate: (path) => console.log('Navigated:', path),
    onSessionExpired: () => (window.location.href = '/login'),
});

// Later: instance.unmount();
```

### React (Host App)

The React host uses `<itops-mfe>` via the `ItopsMfeBridge` component:

```tsx
const ItopsMfeBridge: React.FC<{ basePath: string }> = ({ basePath }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        ensureRemoteLoaded().then(() => {
            const el = document.createElement('itops-mfe');
            el.setAttribute('initial-path', location.pathname);

            el.authConfig = {
                type: 'keycloak',
                config: { url: '...', realm: 'AIOT', clientId: 'Check-AIOT' },
            };

            el.addEventListener('mfe-navigate', (e) => {
                navigate(e.detail.path, { replace: true });
            });
            el.addEventListener('mfe-session-expired', () => {
                keycloak.logout({ redirectUri: window.location.origin });
            });

            containerRef.current.appendChild(el);
        });

        return () => {
            /* remove element -> triggers unmount */
        };
    }, [basePath]);

    return <div ref={containerRef} style={{ width: '100%', height: '98%' }} />;
};
```

### Angular

```typescript
@Component({
    selector: 'app-mfe-host',
    template: `<div #container style="width:100%;height:100%"></div>`,
})
export class MfeHostComponent implements OnInit, OnDestroy {
    @ViewChild('container', { static: true }) container!: ElementRef;
    private mfeElement: HTMLElement | null = null;

    async ngOnInit() {
        await this.loadScript('https://your-app.com/itops-mfe/itops-mfe-remote-entry.js');

        this.mfeElement = document.createElement('itops-mfe');
        this.mfeElement.setAttribute('initial-path', '/itops/incident-ai');

        (this.mfeElement as any).authConfig = {
            type: 'keycloak',
            config: { url: '...', realm: 'AIOT', clientId: 'Check-AIOT' },
        };

        this.mfeElement.addEventListener('mfe-navigate', ((e: CustomEvent) => {
            this.router.navigateByUrl(e.detail.path);
        }) as EventListener);

        this.container.nativeElement.appendChild(this.mfeElement);
    }

    ngOnDestroy() {
        this.mfeElement?.remove();
    }
}
```

### Vue

```vue
<template>
    <div ref="container" style="width:100%;height:100%"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const container = ref(null);
const router = useRouter();
let mfeElement = null;

onMounted(async () => {
    await loadRemote();
    mfeElement = document.createElement('itops-mfe');
    mfeElement.setAttribute('initial-path', '/itops/incident-ai');

    mfeElement.authConfig = {
        type: 'keycloak',
        config: { url: '...', realm: 'AIOT', clientId: 'Check-AIOT' },
    };

    mfeElement.addEventListener('mfe-navigate', (e) => {
        router.push(e.detail.path);
    });

    container.value.appendChild(mfeElement);
});

onUnmounted(() => {
    mfeElement?.remove();
});
</script>
```

### Other Vite / Next.js Apps

```tsx
'use client';
import { useEffect, useRef } from 'react';

export default function MFEPage() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let el: HTMLElement;
        const script = document.createElement('script');
        script.type = 'module';
        script.src = '/itops-mfe/itops-mfe-remote-entry.js';
        script.onload = () => {
            el = document.createElement('itops-mfe');
            el.setAttribute('initial-path', '/itops/incident-ai');
            (el as any).authConfig = {
                type: 'keycloak',
                config: { url: '...', realm: 'AIOT', clientId: 'Check-AIOT' },
            };
            containerRef.current?.appendChild(el);
        };
        document.head.appendChild(script);
        return () => el?.remove();
    }, []);

    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
```

---

## Authentication

The MFE supports three auth modes via the `MFEAuthConfig` union type. The host owns login/logout — the MFE **never** initiates login or logout flows.

Auth initialization is **non-blocking** — the MFE renders a loading indicator immediately via the `AuthGate` component, then swaps in the full app once auth completes. If auth
fails, an error screen with a retry button is shown.

### Keycloak

Uses `check-sso` to silently pick up the host's existing Keycloak session.

```
Host App                          MFE
────────                          ───
1. User logs in via Keycloak
   (login-required)
2. Session cookie set in browser
                                  3. mountItopsMfeRoute() called
                                  4. React renders immediately (loading indicator)
                                  5. Auth initializes in parallel:
                                     -> Keycloak.init({ onLoad: 'check-sso' })
                                     -> Picks up existing session silently
                                  6. Auth ready -> full app renders
                                  7. 30s refresh timer starts
                                  8. If refresh fails ->
                                     onSessionExpired() callback fires
9. Host receives session-expired
   event -> keycloak.logout()
```

### Entra ID (Azure AD)

Uses MSAL `ssoSilent` to pick up the host's Azure AD session.

```ts
auth: { type: 'entra-id', config: { clientId, authority, redirectUri } }
```

### Token (Raw JWT)

The host passes a pre-obtained JWT token. Useful when the host uses a custom auth system.

```ts
auth: { type: 'token', config: { token: 'eyJhbGciOi...' } }
```

Runtime token refresh:

```ts
instance.updateToken?.('new-jwt'); // Programmatic
document.querySelector('itops-mfe').updateToken('new-jwt'); // Web component
```

---

## Style Isolation (Shadow DOM)

### How Shadow DOM Works

The MFE uses an **open shadow root** for complete style isolation:

```
<div id="itops-mfe-root">          ← light DOM (visible to host)
  #shadow-root (open)              ← shadow boundary
    adoptedStyleSheets: [sheet]    ← Tailwind + brand CSS (via CSSStyleSheet, no FOUC)
    <style> / <link>               ← Component CSS modules (dev: moved; prod: <link>)
    <div id="itops-mfe-emotion">   ← Emotion/MUI styles injected here
    <div id="itops-mfe-render-root">
      ... React tree ...           ← all portals, dialogs, tooltips render here too

document.adoptedStyleSheets        ← hoisted @property rules (Tailwind v4)
```

**What this guarantees:**

- Host CSS (Bootstrap, Tailwind, custom) **cannot** reach MFE elements
- MFE CSS (Tailwind, MUI, brand styles) **cannot** leak into the host
- No `!important` needed, no selector prefixing, no specificity workarounds
- Host's `.container`, `.btn`, `.row` classes have zero effect inside the MFE

**Style injection strategy (Meefik pattern):**

The MFE reuses `src/index.css` — the host app's stylesheet — as a single source of truth. `itops-mfe-styles.css` imports it via `@import '../index.css'`, adding only `:host` and
render root resets.

| Layer                     | How it works                                                                                                                                                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tailwind + brand CSS**  | `import mfeStyles from './itops-mfe-styles.css?inline'` -> Vite returns the fully processed CSS as a string -> `:root` is replaced with `:host` -> applied to `shadowRoot.adoptedStyleSheets` via `CSSStyleSheet.replaceSync()`. Instant, no FOUC, memory-efficient (shared sheet). |
| **@property hoisting**    | `@property` rules are document-global and don't work in shadow DOM. At mount time, all `CSSPropertyRule` instances are extracted from the shadow sheet and pushed to `document.adoptedStyleSheets` so Tailwind v4 initial values register globally.                                 |
| **Component CSS modules** | Dev: `MutationObserver` moves Vite-injected `<style>` tags from `<head>` into the shadow root. Prod: `<link>` to extracted `assets/itops-mfe-styles.css` (contains only component CSS modules, not Tailwind). Base URL captured from `index.ts` entry module.                       |
| **HMR**                   | `import.meta.hot.accept('./itops-mfe-styles.css?inline', …)` calls `replaceSync()` on the shared `CSSStyleSheet`. All mounted shadow roots pick up the new styles instantly via the live `adoptedStyleSheets` reference.                                                            |

**References:**

- [Tailwind CSS v4 and the Shadow DOM](https://meefik.dev/2025/03/19/tailwindcss-and-shadow-dom/)
- [tailwindlabs/tailwindcss#15005](https://github.com/tailwindlabs/tailwindcss/issues/15005) — @property not supported in shadow roots
- [tailwindlabs/tailwindcss#1935](https://github.com/tailwindlabs/tailwindcss/discussions/1935) — Tailwind with Shadow DOM

### Tailwind v4 in Shadow DOM

Tailwind v4 uses `@property` CSS rules to initialize `--tw-*` variables (for shadows, borders, rings, gradients, transforms, etc.). `@property` rules are **document-global** and
don't apply inside shadow DOM ([w3c/css-houdini-drafts#1085](https://github.com/w3c/css-houdini-drafts/issues/1085)).

**Fix (automatic @property hoisting):** At mount time, `mountItopsMfeRoute.tsx` extracts every `CSSPropertyRule` from the shadow stylesheet and hoists it to a document-level
`adoptedStyleSheet`:

```ts
// mountItopsMfeRoute.tsx — simplified
const sheet = new CSSStyleSheet();
for (const rule of mfeShadowSheet.cssRules) {
    if (rule instanceof CSSPropertyRule) {
        sheet.insertRule(rule.cssText); // hoist to document scope
    }
}
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
```

This is fully automatic — no manual `--tw-*` variable list to maintain. When Tailwind adds new `@property` declarations in future releases, they are hoisted automatically.

Additionally, `:root` selectors in the CSS (where Tailwind defines theme variables like `--spacing`, `--color-*`) are replaced with `:host` at build time so they resolve inside the
shadow root.

Without these two fixes, utilities like `border`, `shadow-lg`, `ring`, `from-blue-500`, `scale-*` silently fail because the variables they depend on are unset or unreachable.

### Emotion / MUI in Shadow DOM

`ItopsMfeMuiThemeProvider.tsx` creates an Emotion cache that targets the shadow root:

```ts
const shadowRoot = getShadowRoot();
const emotionContainer = document.createElement('div');
shadowRoot.prepend(emotionContainer);

const cache = createCache({
    key: 'mfe',
    container: emotionContainer, // Emotion injects <style> tags here
});
```

MUI portal components (Dialog, Popover, Menu, Tooltip, etc.) are configured to render inside the shadow root render container via the `container` prop.

### Fonts

`@font-face` declarations don't work inside shadow DOM — the browser can't load fonts from shadow-scoped stylesheets. Fonts are loaded in the **light DOM** via a `<link>` tag in
`document.head`:

```ts
// mountItopsMfeRoute.tsx
const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=Cabin:...';
document.head.appendChild(link);
```

The `font-family: 'Cabin'` declaration inside the shadow root then picks up the font since font declarations are document-global.

---

## Portal Containment

React portals (MUI dialogs, dropdowns, tooltips, custom modals) must render inside the shadow root to receive MFE styles.

### How it works

1. **`ItopsMfePortalProvider`** — React context providing the shadow root's render container
2. **`ItopsMfeMuiThemeProvider`** — Overrides MUI's default portal containers:

    ```ts
    MuiDialog: {
        defaultProps: {
            container: getContainer;
        }
    }
    MuiDrawer: {
        defaultProps: {
            container: getContainer;
        }
    }
    MuiModal: {
        defaultProps: {
            container: getContainer;
        }
    }
    MuiPopover: {
        defaultProps: {
            container: getContainer;
        }
    }
    MuiPopper: {
        defaultProps: {
            container: getContainer;
        }
    }
    MuiMenu: {
        defaultProps: {
            container: getContainer;
        }
    }
    MuiTooltip: {
        slotProps: {
            popper: {
                container: getContainer;
            }
        }
    }
    MuiAutocomplete: {
        slotProps: {
            popper: {
                container: getContainer;
            }
        }
    }
    MuiSelect: {
        MenuProps: {
            container: getContainer;
        }
    }
    ```

3. **`getPortalContainer()`** — Utility for custom portals:
    ```tsx
    import { getPortalContainer } from '@/shared/utils/get-portal-container';
    createPortal(<MyDropdown />, getPortalContainer());
    ```
    Returns the render root inside the shadow DOM when running as MFE, `document.body` when standalone.

**When adding new portal-based components**, always use `getPortalContainer()` instead of `document.body`.

---

## Shadow DOM Event Handling

Shadow DOM **retargets** events that cross the shadow boundary. When a `mousedown` event originates inside the shadow root but is caught on `document`, `e.target` becomes the
shadow host — not the element that was actually clicked. This breaks `element.contains(e.target)` checks used in "click outside to close" patterns.

### Click Outside Detection

**Wrong** (breaks in Shadow DOM):

```ts
document.addEventListener('mousedown', (e) => {
    if (!panelRef.current?.contains(e.target as Node)) {
        setIsOpen(false); // Always fires — target is shadow host, not the button
    }
});
```

**Correct** — use `composedPath()`:

```ts
import { useClickOutside } from '@/shared/hooks/useClickOutside';

const closePanel = useCallback(() => setIsOpen(false), []);
useClickOutside([triggerRef, panelRef], closePanel);
```

The `useClickOutside` hook uses `e.composedPath()` which returns the full event path through all shadow DOM boundaries. All dropdown/popover/panel components in the codebase use
this hook.

### Lexical Rich Text Editor

Lexical (v0.42) has two Shadow DOM incompatibilities:

1. **`selectionchange`** — Lexical registers this on `document`, but inside Shadow DOM the event fires on the shadow root. Lexical never sees selection changes, so the toolbar
   doesn't update (block type always shows "Normal", links aren't detected).

2. **`window.getSelection()`** — Doesn't reliably return selections from inside shadow trees. The `getComposedRanges()` API is needed instead.

**Fix:** `ShadowDomSelectionPlugin` (included in the editor automatically) bridges selection:

- Listens for `selectionchange` on the shadow root + `mouseup`/`keyup` on the editor root
- Uses `Selection.getComposedRanges({ shadowRoots })` (Chrome 125+, Firefox 132+, Safari 17+) to read the actual selection
- Creates a Selection proxy and syncs it into Lexical's internal model via `$createRangeSelectionFromDom`

This is based on the approach from [facebook/lexical#7790](https://github.com/facebook/lexical/pull/7790) (Shadow DOM support PR, not yet merged). Once Lexical ships native Shadow
DOM support, the plugin can be removed.

---

## Scroll Containment

The MFE root route uses **absolute positioning** to create a reliable scroll container:

```tsx
const itopsMfeRootRoute = createRootRoute({
    component: () => (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <div style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
                <Outlet />
            </div>
        </div>
    ),
});
```

---

## Error Boundaries & 404

### 1. Top-Level ErrorBoundary (mountItopsMfeRoute.tsx)

Wraps the entire MFE app tree using `react-error-boundary`. Catches errors during provider initialization, context setup, or any unhandled error.

### 2. Auth Error Handling (AuthGate)

If auth initialization fails, `AuthGate` renders `ErrorBoundaryFallback` with a "reload" button instead of a blank page.

### 3. Per-Route Defaults (itops-mfe-routes.tsx)

- **`defaultErrorComponent`** — Renders `ErrorBoundaryFallback` with error details
- **`defaultNotFoundComponent`** — Renders the `NotFoundRoute` 404 page
- **`defaultPendingComponent`** — Shows `ComponentLoadingIndicator` while lazy chunks load
- **`defaultPendingMs: 500`** — Only shows pending indicator after 500ms (prevents flash-of-loading)

---

## Global Components

| Component           | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `GlobalAlertDialog` | Modal confirmation dialogs triggered from anywhere in the app |
| `GlobalAlertToast`  | Toast notifications (success, error, info, warning)           |
| `OfflineGuard`      | Detects network offline state and shows a banner              |

These render inside the shadow root and use the portal containment system.

---

## Routing

The MFE uses **memory history** — it does not read or write `window.location`.

```
Host URL bar                    MFE Router (memory)
────────────                    ───────────────────
/itops/incident-ai         ->    initialPath="/itops/incident-ai"
                                MFE navigates internally...
                           ←    onNavigate("/itops/incident-ai/detail/123")
/itops/incident-ai/detail/123   (host updates URL bar)
```

Currently exposed routes:

- `/itops/incident-ai` -> `IncidentAIPage`
- `/transition-ai/knowledge-ai` -> `KnowledgeAIPage`

---

## Extending the MFE

### Adding a New Route

1. Add the route to `src/itops-mfe/itops-mfe-routes.tsx`:

```tsx
const newRoute = createRoute({
    getParentRoute: () => itopsMfeRootRoute,
    path: '/your-module/new-page',
    component: lazyRouteComponent(async () => import('@/modules/your-module/pages/NewPage')),
    pendingComponent: ComponentLoadingIndicator,
});
```

2. Add the host route in the consuming app
3. Rebuild: `npm run build`

### Adding New Web Component Attributes

1. Update `observedAttributes` in `itops-mfe-element.ts`
2. Read the attribute in `mount()` and pass it to `mountItopsMfeRoute` options
3. Update `MFEMountOptions` in `types.ts`

### Adding New Events

```ts
this.dispatchEvent(
    new CustomEvent('mfe-your-event', {
        detail: {/* your data */},
        bubbles: true,
        composed: true, // Required to cross shadow DOM boundary
    }),
);
```

### Adding New Portal Components

Always use `getPortalContainer()` instead of `document.body`:

```tsx
import { getPortalContainer } from '@/shared/utils/get-portal-container';
createPortal(<YourComponent />, getPortalContainer());
```

For injecting `<style>` tags dynamically, use the shadow root:

```tsx
const shadowRoot = document.getElementById('itops-mfe-root')?.shadowRoot;
(shadowRoot ?? document.head).appendChild(styleEl);
```

---

## Deployment

### Nginx

```
dist/
├── index.html
├── assets/
└── itops-mfe/
    ├── itops-mfe-remote-entry.js
    ├── assets/
    │   └── itops-mfe-styles.css
    └── chunks/
        └── *.js
```

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /itops-mfe/ {
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, OPTIONS";

        location ~* /itops-mfe/chunks/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Access-Control-Allow-Origin *;
        }

        location = /itops-mfe/itops-mfe-remote-entry.js {
            expires 5m;
            add_header Cache-Control "public, must-revalidate";
            add_header Access-Control-Allow-Origin *;
        }
    }

    gzip on;
    gzip_types text/css application/javascript application/json;
}
```

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Docker Compose (Host + Remote)

```yaml
version: '3.8'
services:
    itops-remote:
        build:
            context: ./ITOps_Toolkit_Frontend_Revamp/itops-toolkit-frontend
        ports:
            - '3000:80'

    itops-host:
        build:
            context: ./IPR001380_ITOpsToolkit/ITOpsToolkit_Frontend
        ports:
            - '3001:80'
        environment:
            - REACT_APP_MFE_URL=http://itops-remote/itops-mfe/itops-mfe-remote-entry.js
```

---

## Local Development

### Standalone (no MFE)

```bash
cd itops-toolkit-frontend
npm run dev
```

### MFE + Host

**Terminal 1 — Remote:**

```bash
cd itops-toolkit-frontend
npm run dev:mfe
```

**Terminal 2 — Host:**

```bash
cd ITOpsToolkit_Frontend
npm start
```

---

## Troubleshooting

| Symptom                                        | Cause                                                      | Fix                                                                                                                          |
| ---------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `Failed to load remote entry`                  | itops-mfe-remote-entry.js not accessible                   | Check URL, CORS headers, network tab                                                                                         |
| `process is not defined`                       | Missing `define` in vite.config.itops-mfe.ts               | Ensure `'process.env.NODE_ENV': JSON.stringify('production')`                                                                |
| Blank page when navigating to MFE route        | Auth initialization blocking render                        | Verify `AuthGate` component is used (auth should not be awaited before render)                                               |
| CSS not loading in shadow DOM                  | `adoptedStyleSheets` not applied                           | Verify `shadowRoot.adoptedStyleSheets` contains the MFE sheet in browser devtools                                            |
| `border`, `shadow`, `ring`, gradient broken    | `@property` rules not hoisted to document scope            | Check `document.adoptedStyleSheets` includes the property sheet; verify `CSSPropertyRule` is supported in the target browser |
| Fonts not rendering                            | `@font-face` inside shadow DOM                             | Fonts must be loaded in light DOM via `<link>` in `document.head`                                                            |
| MUI dialog/popover unstyled                    | Portal rendering outside shadow root                       | Check `getPortalContainer()` returns shadow root render container                                                            |
| Emotion styles not in shadow root              | Cache not targeting shadow root                            | Verify `createCache({ container: emotionContainer })` in `ItopsMfeMuiThemeProvider`                                          |
| Dynamic `<style>` tags not applying            | Injected into `document.head` instead of shadow root       | Use `getShadowRoot() ?? document.head` as target                                                                             |
| Host styles leaking into MFE                   | Shadow DOM not attached                                    | Inspect DOM: `#itops-mfe-root` should have a `#shadow-root` child                                                            |
| MFE styles leaking into host                   | Styles not isolated in shadow DOM                          | Main CSS uses `adoptedStyleSheets` (shadow-scoped). Check no stale `<style>` in `<head>`                                     |
| HMR not updating styles                        | `?inline` HMR not firing                                   | Verify `import.meta.hot.accept('./itops-mfe-styles.css?inline', …)` in `mountItopsMfeRoute.tsx`                              |
| Events not reaching host                       | Missing `composed: true`                                   | Custom events must use `{ bubbles: true, composed: true }` to cross shadow boundary                                          |
| Dropdown/popover closes immediately on click   | `e.target` retargeted by Shadow DOM                        | Use `useClickOutside` hook (uses `composedPath()`) instead of `e.target` / `.contains()`                                     |
| Lexical toolbar always shows "Normal"          | `selectionchange` doesn't fire on `document` in Shadow DOM | Ensure `ShadowDomSelectionPlugin` is included in the editor                                                                  |
| Lexical links/headings not detected            | `window.getSelection()` can't see inside shadow root       | `ShadowDomSelectionPlugin` uses `getComposedRanges()` to bridge selection                                                    |
| Component CSS missing in Shadow DOM (dev)      | Component `<style>` tags stuck in `<head>`                 | `attachComponentStyles()` observer moves all `<style data-vite-dev-id="…/src/…">` tags into shadow root                      |
| Production CSS `<link>` 404                    | `import.meta.url` in code-split chunk has wrong base path  | Base URL is captured from `index.ts` entry module via `_setMfeBaseUrl()`                                                     |
| `customElements.get('itops-mfe')` is undefined | Script not loaded as module                                | Use `<script type="module">`, not `<script>`                                                                                 |
| Chunks fail to load (404)                      | Incorrect base URL                                         | Check `base` in vite.config.itops-mfe.ts matches deployment path                                                             |
