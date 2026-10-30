import Keycloak from 'keycloak-js';
import type { IAuthProvider, AuthUser, AuthState, AuthStateChangeCallback, UserSnowDetails } from '@/shared/modules/auth/types/auth';
import { INITIAL_AUTH_STATE } from '@/shared/modules/auth/context/AuthContext';
import { appConfig } from '@/config/app-config';
import logger from '@/shared/utils/logger';
import { fetchUserServiceNowDetails } from '@/shared/modules/auth/services/fetch-user-servicenow-details';
import type { KeycloakBridgeConfig } from './types';
import trimTrailingSlashes from '@/shared/modules/auth/utils/trim-url-trailing-slashes';

declare module 'keycloak-js' {
    interface KeycloakTokenParsed {
        groups?: string[];
    }
}

const extractUser = (keycloak: Keycloak): AuthUser | null => {
    const token = keycloak.tokenParsed;
    if (!token) return null;

    const userName = (token as Record<string, unknown>)[appConfig.userServiceNowUserIDKeyInAuth];

    if (!userName || typeof userName !== 'string') {
        logger.error('ITOPS-MFE Failed to extract userName from Keycloak token');
        return null;
    }

    return {
        id: token.sub ?? '',
        uniqueId: userName,
        username: userName,
        displayName: ((token as Record<string, unknown>).name as string) ?? userName,
        email: (token as Record<string, unknown>).email as string | undefined,
        tenantId: keycloak.realm,
        roles: keycloak.realmAccess?.roles ?? [],
        raw: token,
        groups: token?.groups ?? [],
    };
};

export class ItopsMfeKeycloakAuthProvider implements IAuthProvider {
    private keycloak: Keycloak;
    private state: AuthState = { ...INITIAL_AUTH_STATE };
    private listeners = new Set<AuthStateChangeCallback>();
    private refreshInterval: ReturnType<typeof setInterval> | null = null;
    private initPromise: Promise<void> | null = null;
    private onSessionExpired?: () => void;
    private pendingUserSnowDetails: Promise<UserSnowDetails> | null = null;

    constructor(config: KeycloakBridgeConfig, onSessionExpired?: () => void) {
        this.onSessionExpired = onSessionExpired;
        this.keycloak = new Keycloak({
            url: trimTrailingSlashes(config.url),
            realm: config.realm,
            clientId: config.clientId,
        });
    }
    getRefreshToken(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    revokeAccessToken(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    revokeRefreshToken(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    async initialize(): Promise<void> {
        if (this.initPromise) return this.initPromise;
        this.initPromise = this.doInit();
        return this.initPromise;
    }

    private async doInit(): Promise<void> {
        try {
            const authenticated = await this.keycloak.init({
                onLoad: 'check-sso',
                silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
                pkceMethod: 'S256',
                flow: 'standard',
                checkLoginIframe: false,
            });

            if (authenticated) {
                this.setupTokenRefresh();
            }

            this.setState({
                isInitialized: true,
                isLoading: false,
                isAuthenticated: authenticated,
                user: authenticated ? extractUser(this.keycloak) : null,
                error: authenticated ? null : new Error('ITOPS-MFE No active session found. Host may not be authenticated.'),
                sessionExpired: false,
            });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error('MFE Keycloak init failed:', msg);
            this.setState({
                isInitialized: true,
                isLoading: false,
                isAuthenticated: false,
                user: null,
                error: new Error(msg),
                sessionExpired: false,
            });
        }
    }

    async login(): Promise<void> {
        // MFE NEVER calls login - host owns auth navigation
        logger.warn('ITOPS-MFE login() called but MFE does not own auth navigation');
    }

    async logout(): Promise<void> {
        // MFE NEVER calls logout - host owns auth navigation
        logger.warn('ITOPS-MFE logout() called but MFE does not own auth navigation');
    }

    getUser(): AuthUser | null {
        if (!this.keycloak.authenticated) return null;
        return extractUser(this.keycloak);
    }

    async getAccessToken(): Promise<string> {
        if (!this.keycloak.token) {
            throw new Error('ITOPS-MFE No active Keycloak session');
        }

        try {
            await this.keycloak.updateToken(30);
        } catch {
            logger.error('ITOPS-MFE Token refresh failed - notifying host');
            this.onSessionExpired?.();
            throw new Error('ITOPS-MFE Session expired');
        }

        return this.keycloak.token;
    }

    async refreshToken(): Promise<string> {
        if (!this.keycloak.token) {
            throw new Error('ITOPS-MFE No active Keycloak session');
        }

        try {
            await this.keycloak.updateToken(-1);
        } catch {
            logger.error('ITOPS-MFE Force refresh failed - notifying host');
            this.onSessionExpired?.();
            throw new Error('ITOPS-MFE Session expired');
        }

        this.refreshState();
        return this.keycloak.token;
    }

    async getUserSnowDetails(): Promise<UserSnowDetails> {
        if (this.state.user?.userSnowDetails) return this.state.user.userSnowDetails;
        if (this.pendingUserSnowDetails) return this.pendingUserSnowDetails;

        if (!this.keycloak.token) throw new Error('ITOPS-MFE No active session');

        const snowUserId = (this.state.user?.raw as Record<string, unknown>)?.[appConfig.userServiceNowUserIDKeyInAuth] as string;
        if (!snowUserId) throw new Error('ITOPS-MFE No SNOW user ID in token');

        this.pendingUserSnowDetails = fetchUserServiceNowDetails({ queryKey: appConfig.servicenowSysUserQueryKey, queryValue: snowUserId })
            .then((details) => {
                const currentUser = this.state.user;
                if (currentUser) {
                    this.setState({
                        ...this.state,
                        user: { ...currentUser, userSnowDetails: details },
                    });
                }
                return details;
            })
            .catch((error) => {
                const msg = error instanceof Error ? error.message : String(error);
                logger.error('ITOPS-MFE Failed to fetch user SNOW details:', msg);
                throw error;
            })
            .finally(() => {
                this.pendingUserSnowDetails = null;
            });

        return this.pendingUserSnowDetails;
    }

    async getUserMemberOfGroups(): Promise<Array<string>> {
        return this.keycloak?.tokenParsed?.groups ?? [];
    }

    hasGroupMembership(group: string): boolean {
        const groups = this.keycloak?.tokenParsed?.groups ?? [];
        return groups.includes(group);
    }

    isAuthenticated(): boolean {
        return !!this.keycloak.authenticated;
    }

    getState(): AuthState {
        return { ...this.state };
    }

    subscribe(callback: AuthStateChangeCallback): () => void {
        this.listeners.add(callback);
        callback(this.state);
        return () => {
            this.listeners.delete(callback);
        };
    }

    destroy(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        this.listeners.clear();
    }

    private setupTokenRefresh(): void {
        this.refreshInterval = setInterval(async () => {
            try {
                const refreshed = await this.keycloak.updateToken(120);
                if (refreshed) {
                    logger.debug('ITOPS-MFE Token refreshed');
                    this.refreshState();
                }
            } catch {
                logger.error('ITOPS-MFE Token refresh failed - notifying host');
                // Stop further refresh attempts - session is dead
                if (this.refreshInterval) {
                    clearInterval(this.refreshInterval);
                    this.refreshInterval = null;
                }
                this.onSessionExpired?.();
                this.setState({
                    ...this.state,
                    isAuthenticated: false,
                    user: null,
                    error: new Error('Session expired'),
                });
            }
        }, 30_000);
    }

    private refreshState(): void {
        const freshUser = extractUser(this.keycloak);
        this.setState({
            ...this.state,
            isAuthenticated: !!this.keycloak.authenticated,
            user: freshUser ? { ...freshUser, userSnowDetails: this.state.user?.userSnowDetails } : null,
        });
    }

    private setState(next: AuthState): void {
        this.state = next;
        this.listeners.forEach((cb) => cb(this.state));
    }
}
