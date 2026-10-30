import ReactDOM from 'react-dom/client';
import type { MFEMountOptions, MFEInstance, MFEAuthConfig } from './types';
import type { IAuthProvider } from '@/shared/modules/auth/types/auth';
import { ItopsMfeKeycloakAuthProvider } from './ItopsMfeKeycloakAuthProvider';
import { ItopsMfeEntraIdAuthProvider } from './ItopsMfeEntraIdAuthProvider';
import { ItopsMfeTokenAuthProvider } from './ItopsMfeTokenAuthProvider';
import { setAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorBoundaryFallback from '@/shared/components/ui/ErrorBoundaryFallback/ErrorBoundaryFallback';
import ItopsMfeApp from './ItopsMfeApp';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { useEffect, useState } from 'react';

/*
 *  Shadow DOM style strategy
 *
 * Tailwind v4 uses @property to register --tw-* custom properties with
 * initial values.  @property is document-global and has NO effect inside
 * a shadow root (spec: w3c/css-houdini-drafts#1085).
 *
 * Instead of maintaining a manual list of --tw-* fallbacks we:
 *
 *   1. Import the MFE stylesheet with ?inline -> Vite returns the fully
 *      processed CSS (Tailwind utilities, theme vars, brand tokens) as
 *      a string.
 *   2. Strip external @import url() rules (fonts are loaded in the
 *      light DOM separately - shadow DOM cannot load @font-face).
 *   3. Replace :root with :host so CSS variables resolve inside the
 *      shadow root.
 *   4. Parse the CSS into a CSSStyleSheet, iterate its rules, and hoist
 *      every CSSPropertyRule to a document-level adoptedStyleSheet.
 *      This makes @property declarations effective globally - their
 *      initial-value and inherits flags work as intended.
 *   5. Attach the stylesheet to the shadow root via adoptedStyleSheets.
 *      This is instant (no FOUC), memory-efficient (shared sheet), and
 *      survives HMR updates via replaceSync().
 *
 * References:
 *   - https://meefik.dev/2025/03/19/tailwindcss-and-shadow-dom/
 *   - https://github.com/tailwindlabs/tailwindcss/issues/15005
 *   - https://github.com/tailwindlabs/tailwindcss/discussions/1935
 */
import mfeStylesRaw from './itops-mfe-styles.css?inline';

/** Module-level reference so other modules can access it (Emotion, portals). */
let _shadowRoot: ShadowRoot | null = null;

/**
 * Base URL of the MFE entry module - set from index.ts where import.meta.url
 * is reliable. In code-split chunks, import.meta.url points to the chunk path
 * which would produce wrong asset URLs.
 */
let _mfeBaseUrl = '';
/** @internal Called once from index.ts entry */
export function _setMfeBaseUrl(url: string) {
    _mfeBaseUrl = url;
}

//  Shared stylesheets

/** Shadow-scoped stylesheet shared across mount cycles. */
const mfeShadowSheet = new CSSStyleSheet();

/** Document-level sheet that holds hoisted @property rules. */
let mfePropertySheet: CSSStyleSheet | null = null;

/**
 * Processes the raw inline CSS for shadow DOM usage.
 *
 * - Strips `@import url(…)` (fonts loaded in light DOM)
 * - Swaps `:root` -> `:host` (shadow DOM equivalent)
 * - Calls `replaceSync` on the shared shadow sheet - any shadow root
 *   using this sheet via `adoptedStyleSheets` sees the change instantly.
 */
function processCss(rawCss: string): void {
    const shadowCss = rawCss.replace(/@import\s+url\([^)]*\)\s*;?/g, '').replace(/:root/g, ':host');
    mfeShadowSheet.replaceSync(shadowCss);
}

// Build the shadow sheet on module load.
processCss(mfeStylesRaw);

// Vite HMR - update the shared sheet in-place when CSS changes.
// Because adoptedStyleSheets hold a live reference, every mounted
// shadow root picks up the new styles automatically.
if (import.meta.hot) {
    import.meta.hot.accept('./itops-mfe-styles.css?inline', (mod) => {
        if (mod?.default) processCss(mod.default);
    });
}

/**
 * Extracts @property rules from the shadow sheet and hoists them into
 * a document-level adoptedStyleSheet so they register globally.
 *
 * Guarded: only runs once; subsequent mount() calls are no-ops.
 */
function hoistPropertyRules(): void {
    if (mfePropertySheet) return; // already hoisted
    if (typeof CSSPropertyRule === 'undefined') return; // browser compat

    const sheet = new CSSStyleSheet();
    for (const rule of mfeShadowSheet.cssRules) {
        if (rule instanceof CSSPropertyRule) {
            sheet.insertRule(rule.cssText);
        }
    }

    if (sheet.cssRules.length > 0) {
        mfePropertySheet = sheet;
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, mfePropertySheet];
    }
}

/** Removes the hoisted @property sheet from the document. */
function removePropertyRules(): void {
    if (!mfePropertySheet) return;
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== mfePropertySheet);
    mfePropertySheet = null;
}

//  Component CSS modules

/**
 * Handles CSS that is NOT covered by the ?inline import - namely CSS
 * modules from individual components (e.g. StatusBadge.module.css).
 *
 * Dev:  Vite injects component CSS as <style> tags in <head>.
 *       We move them into the shadow root so they take effect.
 *       A MutationObserver catches lazy-loaded styles added later.
 *
 * Prod: Vite extracts component CSS into a separate asset file.
 *       We inject a <link> pointing to it inside the shadow root.
 */
function isMfeStyle(style: HTMLStyleElement): boolean {
    const devId = style.getAttribute('data-vite-dev-id') ?? '';
    return devId.includes('/src/') || devId.includes('\\src\\') || devId.includes('itops-mfe');
}

function attachComponentStyles(shadowRoot: ShadowRoot): () => void {
    const movedStyles: { el: HTMLStyleElement; parent: Element; next: Element | null }[] = [];

    function moveStyle(style: HTMLStyleElement) {
        movedStyles.push({ el: style, parent: style.parentElement!, next: style.nextElementSibling });
        shadowRoot.appendChild(style);
    }

    // Move existing Vite-injected <style> tags from <head>
    for (const style of document.head.querySelectorAll('style')) {
        if (isMfeStyle(style)) moveStyle(style);
    }

    // Watch for styles added later (lazy-loaded route components)
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node instanceof HTMLStyleElement && node.parentElement === document.head && isMfeStyle(node)) {
                    moveStyle(node);
                }
            }
        }
    });
    observer.observe(document.head, { childList: true });

    // Production: <link> to extracted component CSS asset
    const baseUrl = _mfeBaseUrl || import.meta.url.substring(0, import.meta.url.lastIndexOf('/') + 1);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${baseUrl}assets/itops-mfe-styles.css`;
    link.setAttribute('data-mfe', 'itops-mfe-components');
    shadowRoot.appendChild(link);

    return () => {
        observer.disconnect();
        for (const { el, parent, next } of movedStyles) {
            if (!parent.isConnected) continue;
            if (next && next.parentNode === parent) parent.insertBefore(el, next);
            else parent.appendChild(el);
        }
        link.remove();
    };
}

// Auth gate

/**
 * Renders the loading indicator until auth initialization completes,
 * then renders the full MFE app. This prevents a blank page while
 * Keycloak SSO / MSAL initializes.
 */
function AuthGate({ authReady, options, container }: { authReady: Promise<void>; options: MFEMountOptions; container: HTMLElement }) {
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [error, setError] = useState<Error | undefined>(undefined);

    useEffect(() => {
        authReady
            .then(() => setState('ready'))
            .catch((err) => {
                setError(err instanceof Error ? err : new Error(String(err)));
                setState('error');
            });
    }, [authReady]);

    if (state === 'loading') return <ComponentLoadingIndicator />;

    if (state === 'error') {
        return (
            <ErrorBoundaryFallback
                title="ITOPS-MFE: Authentication failed"
                message="Unable to initialize authentication. Please try again or contact support."
                description={error?.message || 'Unknown authentication error'}
                error={error}
                reset={() => window.location.reload()}
            />
        );
    }

    return <ItopsMfeApp options={options} container={container} />;
}

// -- Fonts -----------------------------------------------------------

/**
 * Injects the Google Fonts stylesheet into the document head.
 * Fonts must be loaded in the light DOM - shadow DOM cannot load @font-face.
 */
function injectFonts(): () => void {
    const fontId = 'itops-mfe-fonts';
    if (document.getElementById(fontId)) return () => {};

    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cabin:ital,wght@0,400..700;1,400..700&display=swap';
    document.head.appendChild(link);

    return () => link.remove();
}

// -- Auth helpers ----------------------------------------------------

function resolveAuthConfig(options: MFEMountOptions): MFEAuthConfig {
    if (options.auth) return options.auth;
    throw new Error('ITOps ITOPS-MFE No auth configuration provided. Pass `auth`.');
}

function createAuthProvider(authConfig: MFEAuthConfig, onSessionExpired?: () => void): IAuthProvider & { destroy?: () => void } {
    switch (authConfig.type) {
        case 'keycloak':
            return new ItopsMfeKeycloakAuthProvider(authConfig.config, onSessionExpired);
        case 'entra-id':
            return new ItopsMfeEntraIdAuthProvider(authConfig.config, onSessionExpired);
        case 'token':
            return new ItopsMfeTokenAuthProvider(authConfig.config, onSessionExpired);
        default:
            throw new Error(`ITOps ITOPS-MFE Unknown auth type`);
    }
}

// -- Mount -----------------------------------------------------------

export async function mountItopsMfeRoute(element: HTMLElement, options: MFEMountOptions): Promise<MFEInstance> {
    const removeFonts = injectFonts();

    const authConfig = resolveAuthConfig(options);
    const itopsMfeAuthProvider = createAuthProvider(authConfig, options.onSessionExpired);
    setAuthProviderInstance(itopsMfeAuthProvider);

    // Create the shadow DOM boundary for complete style isolation
    const shadowHost = document.createElement('div');
    shadowHost.id = 'itops-mfe-root';
    shadowHost.style.width = '100%';
    shadowHost.style.height = '100%';
    element.appendChild(shadowHost);

    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
    _shadowRoot = shadowRoot;

    // Hoist @property rules to document scope (Tailwind v4 needs them global)
    hoistPropertyRules();

    // Apply the shared stylesheet - instant, no FOUC
    shadowRoot.adoptedStyleSheets = [mfeShadowSheet];

    // Attach component CSS modules (observer for dev, <link> for prod)
    const detachComponentStyles = attachComponentStyles(shadowRoot);

    // React render container inside the shadow root
    const renderContainer = document.createElement('div');
    renderContainer.id = 'itops-mfe-render-root';
    renderContainer.style.width = '100%';
    renderContainer.style.height = '100%';
    shadowRoot.appendChild(renderContainer);

    const root = ReactDOM.createRoot(renderContainer);

    const authReady = itopsMfeAuthProvider.initialize();

    root.render(
        <ErrorBoundary
            fallbackRender={({ error, resetErrorBoundary }) => (
                <ErrorBoundaryFallback error={error as Error} reset={resetErrorBoundary} title="Something went wrong" description={JSON.stringify(error)} />
            )}
        >
            <AuthGate authReady={authReady} options={options} container={renderContainer} />
        </ErrorBoundary>,
    );

    return {
        unmount: () => {
            root.unmount();
            itopsMfeAuthProvider.destroy?.();
            detachComponentStyles();
            removePropertyRules();
            removeFonts();
            _shadowRoot = null;
            shadowHost.remove();
        },
        updateToken: authConfig.type === 'token' ? (token: string) => (itopsMfeAuthProvider as ItopsMfeTokenAuthProvider).updateToken(token) : undefined,
    };
}

/** Expose the shadow root getter for portal/emotion injection */
export function getShadowRoot(): ShadowRoot | null {
    return _shadowRoot;
}
