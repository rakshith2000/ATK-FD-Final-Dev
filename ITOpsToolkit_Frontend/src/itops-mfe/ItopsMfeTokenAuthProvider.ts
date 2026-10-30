import { jwtDecode } from 'jwt-decode';
import type { IAuthProvider, AuthUser, AuthState, AuthStateChangeCallback, UserSnowDetails } from '@/shared/modules/auth/types/auth';
import { INITIAL_AUTH_STATE } from '@/shared/modules/auth/context/AuthContext';
import { appConfig } from '@/config/app-config';
import logger from '@/shared/utils/logger';
import { fetchUserServiceNowDetails } from '@/shared/modules/auth/services/fetch-user-servicenow-details';
import type { TokenBridgeConfig } from './types';

/**
 * MFE Token auth provider.
 * The host passes a raw JWT token - the MFE just uses it for API calls.
 * The host is responsible for refreshing the token and calling updateToken().
 * Works with any auth system (OAuth2, SAML, custom JWT, etc.).
 */
export class ItopsMfeTokenAuthProvider implements IAuthProvider {
    private token: string;
    private user: AuthUser | null;
    private state: AuthState = { ...INITIAL_AUTH_STATE };
    private listeners = new Set<AuthStateChangeCallback>();
    private onSessionExpired?: () => void;
    private pendingUserSnowDetails: Promise<UserSnowDetails> | null = null;

    constructor(config: TokenBridgeConfig, onSessionExpired?: () => void) {
        this.token = config.token;
        this.onSessionExpired = onSessionExpired;
        this.user = config.user ? this.buildUserFromConfig(config.user) : this.extractUserFromToken(config.token);
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
        this.setState({
            isInitialized: true,
            isLoading: false,
            isAuthenticated: !!this.token,
            user: this.user,
            error: this.token ? null : new Error('MFE Token: No token provided'),
            sessionExpired: false,
        });
    }

    /** Called by the host to update the token at runtime */
    updateToken(newToken: string): void {
        this.token = newToken;
        this.user = this.extractUserFromToken(newToken);
        this.setState({
            ...this.state,
            isAuthenticated: true,
            user: this.user ? { ...this.user, userSnowDetails: this.state.user?.userSnowDetails } : null,
        });
    }

    async login(): Promise<void> {
        logger.warn('MFE Token: login() called but MFE does not own auth navigation');
    }

    async logout(): Promise<void> {
        logger.warn('MFE Token: logout() called but MFE does not own auth navigation');
    }

    getUser(): AuthUser | null {
        return this.user;
    }

    async getAccessToken(): Promise<string> {
        if (!this.token) {
            this.onSessionExpired?.();
            throw new Error('MFE Token: No token available');
        }

        // Check if token is expired
        try {
            const decoded = jwtDecode(this.token);
            if (decoded.exp && decoded.exp * 1000 < Date.now()) {
                logger.error('MFE Token: Token expired - notifying host');
                this.onSessionExpired?.();
                throw new Error('MFE Token: Token expired');
            }
        } catch (e) {
            // If token can't be decoded, still return it - the backend will reject if invalid
            if ((e as Error).message === 'MFE Token: Token expired') throw e;
        }

        return this.token;
    }

    async refreshToken(): Promise<string> {
        // Token mode cannot refresh - the host must call updateToken()
        logger.warn('MFE Token: refreshToken() called - host must provide updated token via updateToken()');
        this.onSessionExpired?.();
        throw new Error('MFE Token: Cannot refresh - host must provide new token');
    }

    async getUserSnowDetails(): Promise<UserSnowDetails> {
        if (this.state.user?.userSnowDetails) return this.state.user.userSnowDetails;
        if (this.pendingUserSnowDetails) return this.pendingUserSnowDetails;

        if (!this.token) throw new Error('MFE Token: No token available');

        const snowUserId = this.user?.uniqueId;
        if (!snowUserId) throw new Error('MFE Token: No SNOW user ID available');

        this.pendingUserSnowDetails = fetchUserServiceNowDetails({ queryKey: appConfig.servicenowSysUserQueryKey, queryValue: snowUserId })
            .then((details) => {
                const currentUser = this.state.user;
                if (currentUser) {
                    this.setState({ ...this.state, user: { ...currentUser, userSnowDetails: details } });
                }
                return details;
            })
            .catch((error) => {
                const msg = error instanceof Error ? error.message : String(error);
                logger.error('MFE Token: Failed to fetch user SNOW details:', msg);
                throw error;
            })
            .finally(() => {
                this.pendingUserSnowDetails = null;
            });

        return this.pendingUserSnowDetails;
    }

    async getUserMemberOfGroups(): Promise<Array<string>> {
        return [];
    }

    hasGroupMembership(group: string): boolean {
        const groups = this.user?.groups ?? [];
        return groups.includes(group);
    }

    isAuthenticated(): boolean {
        return !!this.token;
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
        this.listeners.clear();
    }

    private buildUserFromConfig(userConfig: NonNullable<TokenBridgeConfig['user']>): AuthUser {
        return {
            id: userConfig.id ?? '',
            uniqueId: userConfig.username,
            username: userConfig.username,
            displayName: userConfig.displayName ?? userConfig.username,
            email: userConfig.email,
            tenantId: userConfig.tenantId,
            roles: userConfig.roles,
            raw: userConfig,
        };
    }

    private extractUserFromToken(token: string): AuthUser | null {
        try {
            const decoded = jwtDecode<Record<string, unknown>>(token);
            const userName = (decoded[appConfig.userServiceNowUserIDKeyInAuth] as string) ?? (decoded.preferred_username as string) ?? (decoded.sub as string);

            if (!userName) return null;

            return {
                id: (decoded.sub as string) ?? '',
                uniqueId: userName,
                username: userName,
                displayName: (decoded.name as string) ?? userName,
                email: decoded.email as string | undefined,
                tenantId: decoded.tid as string | undefined,
                roles: (decoded.realm_access as { roles?: string[] })?.roles ?? [],
                raw: decoded,
            };
        } catch {
            logger.warn('MFE Token: Could not decode JWT - user info unavailable');
            return null;
        }
    }

    private setState(next: AuthState): void {
        this.state = next;
        this.listeners.forEach((cb) => cb(this.state));
    }
}
