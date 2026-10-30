export interface KeycloakBridgeConfig {
    url: string;
    realm: string;
    clientId: string;
}

export interface EntraIdBridgeConfig {
    clientId: string;
    authority: string;
    redirectUri?: string;
}

export interface TokenBridgeConfig {
    /** The JWT access token. Host is responsible for keeping it fresh. */
    token: string;
    /** Optional: user info extracted from the token */
    user?: {
        id?: string;
        username: string;
        displayName?: string;
        email?: string;
        tenantId?: string;
        roles?: string[];
    };
}

// Auth union - exactly one must be provided
export type MFEAuthConfig = { type: 'keycloak'; config: KeycloakBridgeConfig } | { type: 'entra-id'; config: EntraIdBridgeConfig } | { type: 'token'; config: TokenBridgeConfig };

// Mount Options

export interface MFEMountOptions {
    auth: MFEAuthConfig;
    initialPath?: string;
    onNavigate: (path: string) => void;
    onSessionExpired?: () => void;
}

export interface MFEInstance {
    unmount: () => void;
    /** Update the auth token at runtime (only for type: 'token') */
    updateToken?: (token: string) => void;
}
