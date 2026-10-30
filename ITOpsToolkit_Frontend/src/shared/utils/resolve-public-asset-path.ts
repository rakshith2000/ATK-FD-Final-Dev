/**
 * Module-level remote base URL - set once by the MFE entry (index.ts).
 * Empty string in standalone mode.
 */
let _remoteBaseUrl = '';

/** Called by the MFE entry to register the remote's base URL. */
export function setRemoteBaseUrl(url: string) {
    _remoteBaseUrl = url;
}

/** Returns the remote base URL if running as MFE, empty string otherwise. */
export function getRemoteBaseUrl(): string {
    return _remoteBaseUrl;
}

/**
 * Resolves a public-folder path (e.g. "/brand-logo") to the correct origin.
 *
 * - Standalone mode: prepends Vite's `base` so custom base paths (e.g. "/app/") work.
 * - MFE mode: prefixes with the remote's base URL so the asset is fetched
 *   from the Vite remote server instead of the Webpack host.
 */
export function resolvePublicAssetPath(path: string): string {
    const stripped = path.startsWith('/') ? path.slice(1) : path;

    if (_remoteBaseUrl) {
        const origin = new URL('.', _remoteBaseUrl).href;
        return `${origin}${stripped}`;
    }

    // Standalone: respect Vite's configured `base` (defaults to "/")
    const base = import.meta.env.BASE_URL ?? '/';
    return `${base}${stripped}`;
}
