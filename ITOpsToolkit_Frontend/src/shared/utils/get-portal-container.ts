/**
 * Returns the portal container element.
 * In MFE mode (shadow DOM), this is the render root inside the shadow root.
 * In standalone mode, this falls back to document.body.
 */
export function getPortalContainer(): HTMLElement {
    // Check shadow DOM first (MFE mode)
    const shadowHost = document.getElementById('itops-mfe-root');
    const shadowRenderRoot = shadowHost?.shadowRoot?.getElementById('itops-mfe-render-root');
    if (shadowRenderRoot) return shadowRenderRoot as HTMLElement;

    // Fallback: legacy non-shadow MFE or standalone mode
    return (shadowHost as HTMLElement) ?? document.body;
}
