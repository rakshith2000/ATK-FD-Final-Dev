import { PublicClientApplication, LogLevel, type AccountInfo, type Configuration } from '@azure/msal-browser';
import type { IAuthProvider, AuthUser, AuthState, AuthStateChangeCallback, UserSnowDetails } from '@/shared/modules/auth/types/auth';
import { INITIAL_AUTH_STATE } from '@/shared/modules/auth/context/AuthContext';
import { appConfig } from '@/config/app-config';
import logger from '@/shared/utils/logger';
import { fetchUserServiceNowDetails } from '@/shared/modules/auth/services/fetch-user-servicenow-details';
import type { EntraIdBridgeConfig } from './types';

const buildMsalConfig = (cfg: EntraIdBridgeConfig): Configuration => ({
    auth: {
        clientId: cfg.clientId,
        authority: cfg.authority,
        redirectUri: cfg.redirectUri ?? window.location.origin,
    },
    cache: {
        cacheLocation: 'sessionStorage',
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) return;
                if (level === LogLevel.Error) logger.error(message);
                else if (level === LogLevel.Warning) logger.warn(message);
            },
        },
    },
});

const mapAccount = (account: AccountInfo): AuthUser | null => {
    const userName = (account?.idTokenClaims as Record<string, unknown>)?.[appConfig.userServiceNowUserIDKeyInAuth];
    if (!userName || typeof userName !== 'string') {
        logger.error('MFE EntraID: Failed to extract userName from account');
        return null;
    }
    return {
        id: account.localAccountId,
        uniqueId: userName,
        username: account.username,
        displayName: account.name || account.username,
        email: account.username,
        tenantId: account.tenantId,
        raw: account,
        groups: [],
    };
};

/**
 * MFE Entra ID auth provider.
 * Uses ssoSilent to pick up the host's existing MSAL session - never shows a login page.
 * The host owns the auth lifecycle (login/logout).
 */
export class ItopsMfeEntraIdAuthProvider implements IAuthProvider {
    private msalInstance: PublicClientApplication;
    private state: AuthState = { ...INITIAL_AUTH_STATE };
    private listeners = new Set<AuthStateChangeCallback>();
    private initPromise: Promise<void> | null = null;
    private onSessionExpired?: () => void;
    private pendingUserSnowDetails: Promise<UserSnowDetails> | null = null;

    constructor(config: EntraIdBridgeConfig, onSessionExpired?: () => void) {
        this.onSessionExpired = onSessionExpired;
        this.msalInstance = new PublicClientApplication(buildMsalConfig(config));
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
            await this.msalInstance.initialize();

            // Try to pick up an existing session from the host
            const response = await this.msalInstance.handleRedirectPromise();

            if (response?.account) {
                this.msalInstance.setActiveAccount(response.account);
            } else if (!this.msalInstance.getActiveAccount() && this.msalInstance.getAllAccounts().length > 0) {
                this.msalInstance.setActiveAccount(this.msalInstance.getAllAccounts()[0]);
            }

            // If no account yet, try ssoSilent to silently pick up session
            if (!this.msalInstance.getActiveAccount()) {
                try {
                    const ssoResult = await this.msalInstance.ssoSilent({ scopes: ['User.Read'] });
                    if (ssoResult?.account) {
                        this.msalInstance.setActiveAccount(ssoResult.account);
                    }
                } catch {
                    logger.warn('MFE EntraID: ssoSilent failed - host may not be authenticated');
                }
            }

            const account = this.msalInstance.getActiveAccount();
            const user = account ? mapAccount(account) : null;

            this.setState({
                isInitialized: true,
                isLoading: false,
                isAuthenticated: !!account,
                user,
                error: account ? null : new Error('MFE EntraID: No active session found'),
                sessionExpired: false,
            });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error('MFE EntraID init failed:', msg);
            this.setState({
                isInitialized: true,
                isLoading: false,
                isAuthenticated: false,
                user: null,
                error: new Error(msg),
                sessionExpired: msg.includes('session expired') || msg.includes('No active session'),
            });
        }
    }

    async login(): Promise<void> {
        logger.warn('MFE EntraID: login() called but MFE does not own auth navigation');
    }

    async logout(): Promise<void> {
        logger.warn('MFE EntraID: logout() called but MFE does not own auth navigation');
    }

    getUser(): AuthUser | null {
        const account = this.msalInstance.getActiveAccount();
        return account ? mapAccount(account) : null;
    }

    async getAccessToken(scopes: string[] = ['User.Read']): Promise<string> {
        const account = this.msalInstance.getActiveAccount();
        if (!account) {
            this.onSessionExpired?.();
            throw new Error('MFE EntraID: No active account');
        }

        try {
            const response = await this.msalInstance.acquireTokenSilent({ account, scopes });
            return response.accessToken;
        } catch {
            logger.error('MFE EntraID: Silent token acquisition failed - notifying host');
            this.onSessionExpired?.();
            throw new Error('MFE EntraID: Session expired');
        }
    }

    async refreshToken(): Promise<string> {
        const account = this.msalInstance.getActiveAccount();
        if (!account) {
            this.onSessionExpired?.();
            throw new Error('MFE EntraID: No active account');
        }

        try {
            const response = await this.msalInstance.acquireTokenSilent({
                account,
                scopes: ['User.Read'],
                forceRefresh: true,
            });
            this.refreshState();
            return response.accessToken;
        } catch {
            logger.error('MFE EntraID: Token refresh failed - notifying host');
            this.onSessionExpired?.();
            throw new Error('MFE EntraID: Session expired');
        }
    }

    async getUserSnowDetails(): Promise<UserSnowDetails> {
        if (this.state.user?.userSnowDetails) return this.state.user.userSnowDetails;
        if (this.pendingUserSnowDetails) return this.pendingUserSnowDetails;

        const account = this.msalInstance.getActiveAccount();
        if (!account) throw new Error('MFE EntraID: No active session');

        const snowUserId = (account?.idTokenClaims as Record<string, unknown>)?.[appConfig.userServiceNowUserIDKeyInAuth] as string;
        if (!snowUserId) throw new Error('MFE EntraID: No SNOW user ID in token');

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
                logger.error('MFE EntraID: Failed to fetch user SNOW details:', msg);
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
        const groups = this.state.user?.groups ?? [];
        return groups.includes(group);
    }

    isAuthenticated(): boolean {
        return !!this.msalInstance.getActiveAccount();
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

    private refreshState(): void {
        const account = this.msalInstance.getActiveAccount();
        const freshUser = account ? mapAccount(account) : null;
        this.setState({
            ...this.state,
            isAuthenticated: !!account,
            user: freshUser ? { ...freshUser, userSnowDetails: this.state.user?.userSnowDetails } : null,
        });
    }

    private setState(next: AuthState): void {
        this.state = next;
        this.listeners.forEach((cb) => cb(this.state));
    }
}
