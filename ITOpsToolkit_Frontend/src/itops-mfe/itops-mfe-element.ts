import type { MFEInstance, MFEMountOptions, MFEAuthConfig } from './types';
import { mountItopsMfeRoute } from './mountItopsMfeRoute';
import logger from '@/shared/utils/logger';

/**
 * <itops-mfe> Web Component
 *
 * A framework-agnostic custom element that mounts the ITOps Toolkit MFE.
 * Works in Angular, Vue, React, Svelte, plain HTML - anything that supports the DOM.
 *
 * **Auth config is passed via JS property (not DOM attributes) to avoid
 * leaking sensitive data in the DOM inspector.**
 *
 * Usage:
 *
 *   const el = document.createElement('itops-mfe');
 *   el.setAttribute('initial-path', '/itops/incident-ai');
 *
 *   // Set auth via JS property - NOT visible in DOM
 *   el.authConfig = {
 *       type: 'keycloak',
 *       config: { url: '...', realm: 'AIOT', clientId: 'Check-AIOT' },
 *   };
 *
 *   document.body.appendChild(el); // triggers mount
 *
 * Auth modes:
 *   - { type: 'keycloak', config: { url, realm, clientId } }
 *   - { type: 'entra-id', config: { clientId, authority, redirectUri? } }
 *   - { type: 'token',    config: { token } }
 *
 * Events:
 *   - 'mfe-navigate': Fired when the MFE navigates internally. detail: { path: string }
 *   - 'mfe-session-expired': Fired when the MFE session expires.
 *   - 'mfe-mounted': Fired when the MFE has finished mounting.
 *   - 'mfe-error': Fired on mount failure. detail: { error: Error }
 *
 * Programmatic API:
 *   el.mount();          // mount manually (auto-mounts on connectedCallback)
 *   el.unmount();        // unmount manually
 *   el.updateToken(jwt); // update token at runtime (token mode only)
 */
class ITOpsMFEElement extends HTMLElement {
    private instance: MFEInstance | null = null;
    private container: HTMLDivElement | null = null;
    private _mounted = false;

    /**
     * Auth configuration - set via JS property to keep credentials out of the DOM.
     *
     * Must be set BEFORE the element is appended to the DOM (or before calling mount()).
     */
    authConfig: MFEAuthConfig | null = null;

    static get observedAttributes() {
        return ['initial-path'];
    }

    connectedCallback() {
        if (!this._mounted) {
            this.mount();
        }
    }

    disconnectedCallback() {
        this.unmount();
    }

    async mount() {
        if (this._mounted) return;

        if (!this.authConfig) {
            const error = new Error(
                '<itops-mfe> requires authConfig to be set as a JS property before mounting. ' + 'Example: el.authConfig = { type: "keycloak", config: { url, realm, clientId } }',
            );
            this.dispatchEvent(new CustomEvent('mfe-error', { detail: { error }, bubbles: true, composed: true }));
            logger.error(error.message);
            return;
        }

        const initialPath = this.getAttribute('initial-path') || '/';

        // Create an inner container
        this.container = document.createElement('div');
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.appendChild(this.container);

        const options: MFEMountOptions = {
            auth: this.authConfig,
            initialPath,
            onNavigate: (path: string) => {
                this.dispatchEvent(
                    new CustomEvent('mfe-navigate', {
                        detail: { path },
                        bubbles: true,
                        composed: true,
                    }),
                );
            },
            onSessionExpired: () => {
                this.dispatchEvent(
                    new CustomEvent('mfe-session-expired', {
                        bubbles: true,
                        composed: true,
                    }),
                );
            },
        };

        try {
            this.instance = await mountItopsMfeRoute(this.container, options);
            this._mounted = true;
            this.dispatchEvent(new CustomEvent('mfe-mounted', { bubbles: true, composed: true }));
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            this.dispatchEvent(new CustomEvent('mfe-error', { detail: { error }, bubbles: true, composed: true }));
            logger.error('<itops-mfe> mount failed:', error);
        }
    }

    /** Update the auth token at runtime (token mode only) */
    updateToken(token: string) {
        if (this.instance?.updateToken) {
            this.instance.updateToken(token);
        } else {
            logger.warn('<itops-mfe> updateToken() is only available in token auth mode');
        }
    }

    unmount() {
        if (this.instance) {
            this.instance.unmount();
            this.instance = null;
        }
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this._mounted = false;
    }
}

// Register the custom element
if (!customElements.get('itops-mfe')) {
    customElements.define('itops-mfe', ITOpsMFEElement);
}

export { ITOpsMFEElement };
