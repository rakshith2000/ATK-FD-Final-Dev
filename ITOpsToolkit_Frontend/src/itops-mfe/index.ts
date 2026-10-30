// Capture MFE base URL from the entry module - import.meta.url is only
// reliable in the entry file itself, not in code-split chunks.
import { setRemoteBaseUrl } from '@/shared/utils/resolve-public-asset-path';
import { _setMfeBaseUrl } from './mountItopsMfeRoute';

const mfeBase = import.meta.url.substring(0, import.meta.url.lastIndexOf('/') + 1);
_setMfeBaseUrl(mfeBase);
setRemoteBaseUrl(mfeBase);

// Vanilla JS API
export { mountItopsMfeRoute } from './mountItopsMfeRoute';

// Web Component (auto-registers <itops-mfe>)
export { ITOpsMFEElement } from './itops-mfe-element';

// Auth providers (for advanced programmatic use)
export { ItopsMfeKeycloakAuthProvider } from './ItopsMfeKeycloakAuthProvider';
export { ItopsMfeEntraIdAuthProvider } from './ItopsMfeEntraIdAuthProvider';
export { ItopsMfeTokenAuthProvider } from './ItopsMfeTokenAuthProvider';

// Types
export type { MFEMountOptions, MFEInstance, MFEAuthConfig, KeycloakBridgeConfig, EntraIdBridgeConfig, TokenBridgeConfig } from './types';
