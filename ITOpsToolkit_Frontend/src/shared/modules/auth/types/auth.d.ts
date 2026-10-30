export interface AuthUser {
    id: string;
    uniqueId: string;
    username: string;
    displayName: string;
    email?: string;
    tenantId?: string;
    roles?: string[];
    groups?: string[];
    raw: unknown;
    userSnowDetails?: UserSnowDetails;
}

export interface UserSnowDetails {
    sys_id: string;
    user_name: string;
    name: string;
    email: string;
}

export interface AuthState {
    isInitialized: boolean;
    isLoading: boolean;
    isAuthenticated: boolean;
    sessionExpired: boolean;
    snowDetails?: SnowDetails;
    user: AuthUser | null;
    error: Error | null;
}

export type AuthStateChangeCallback = (state: AuthState) => void;

export type AuthResourceTarget = 'backend' | 'serviceNow' | 'ms-graph';

export interface IAuthProvider {
    initialize(): Promise<void>;
    login(): Promise<void>;
    logout(): Promise<void>;
    revokeAccessToken(): Promise<void>;
    revokeRefreshToken(): Promise<void>;
    getUser(): AuthUser | null;
    getAccessToken(targetOrScopes?: AuthResourceTarget | string[]): Promise<string>;
    getkeycloakIdapBrokerAccessToken?(): Promise<string>;
    getRefreshToken(): Promise<string>;
    refreshToken(targetOrScopes?: AuthResourceTarget | string[]): Promise<string>;
    isAuthenticated(): boolean;
    getState(): AuthState;
    subscribe(callback: AuthStateChangeCallback): () => void;
    getUserSnowDetails: () => Promise<UserSnowDetails>;
    getUserMemberOfGroups: () => Promise<Array<string>>;
    hasGroupMembership(group: string): boolean;
}

export type AuthProviderType = 'entra-id' | 'keycloak';

export type KeycloakAuthIdentityProvider = 'keycloak' | 'others';
