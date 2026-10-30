import { PublicClientApplication, EventType, LogLevel, type AccountInfo, type AuthenticationResult, type Configuration, type RedirectRequest } from '@azure/msal-browser';
import type { IAuthProvider, AuthUser, AuthState, AuthStateChangeCallback, UserSnowDetails, AuthResourceTarget } from '../../types/auth';
import { appConfig, type EntraIdConfig } from '@/config/app-config';
import logger from '@/shared/utils/logger';
import { INITIAL_AUTH_STATE } from '../../context/AuthContext';
import { fetchUserServiceNowDetails } from '../../services/fetch-user-servicenow-details';

const getAllLoginScopes = (cfg: EntraIdConfig): string[] => cfg.scopes.default;

/**
 * Scopes used solely for background session heartbeat & tab focus checks.
 * Needs only a single valid resource (e.g. ms-graph) to validate the session with Entra ID.
 */
const getSessionHeartbeatScopes = (cfg: EntraIdConfig): string[] => {
    if (cfg.scopes['ms-graph'] && cfg.scopes['ms-graph'].length > 0) {
        return cfg.scopes['ms-graph'];
    }
    if (cfg.scopes.serviceNow && cfg.scopes.serviceNow.length > 0) {
        return cfg.scopes.serviceNow;
    }
    if (cfg.scopes.backend && cfg.scopes.backend.length > 0) {
        return cfg.scopes.backend;
    }
    return [];
};

const buildMsalConfig = (cfg: EntraIdConfig): Configuration => {
    return {
        auth: {
            clientId: cfg.clientId,
            authority: cfg.authority,
            redirectUri: cfg.redirectUri,
            postLogoutRedirectUri: cfg.postLogoutRedirectUri,
        },
        cache: {
            cacheLocation: 'sessionStorage',
        },
        system: {
            loggerOptions: {
                loggerCallback: (level, message, containsPii) => {
                    if (containsPii) return;
                    switch (level) {
                        case LogLevel.Error:
                            logger.error(message);
                            return;
                        case LogLevel.Info:
                            logger.info(message);
                            return;
                        case LogLevel.Verbose:
                            logger.debug(message);
                            return;
                        case LogLevel.Warning:
                            logger.warn(message);
                            return;
                    }
                },
            },
        },
    };
};

const buildLoginRequest = (cfg: EntraIdConfig): RedirectRequest => ({
    scopes: getAllLoginScopes(cfg),
    redirectUri: cfg.redirectUri,
    redirectStartPage: window.location.href,
});

const cleanEntraIdUrlParams = (): void => {
    const url = new URL(window.location.href);
    const paramsToRemove = ['state', 'session_state', 'code', 'error', 'error_description', 'client_info'];
    let modified = false;

    for (const param of paramsToRemove) {
        if (url.searchParams.has(param)) {
            url.searchParams.delete(param);
            modified = true;
        }
    }

    let cleanUrl = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '');
    if (url.hash && (url.hash.includes('code=') || url.hash.includes('error=') || url.hash.includes('state='))) {
        cleanUrl += '';
        modified = true;
    } else {
        cleanUrl += url.hash;
    }

    if (modified) {
        window.history.replaceState(window.history.state, document.title, cleanUrl);
    }
};

const mapAccount = (account: AccountInfo): AuthUser => {
    const claims = account?.idTokenClaims as Record<string, unknown> | undefined;
    const userNameClaim = claims?.[appConfig.userServiceNowUserIDKeyInAuth];
    const userName =
        (typeof userNameClaim === 'string' && userNameClaim.length > 0 ? userNameClaim : null) ||
        (claims?.preferred_username as string) ||
        (claims?.upn as string) ||
        account.username;

    if (!userName || typeof userName !== 'string') {
        const error = new Error(`Unable to retrive userServiceNowUniqueIdKeyName from MS Account Info`);
        logger.error('Failed to fetch userServiceNowUniqueIdKeyName - userName from MS Account Info', error);
        throw error;
    }

    const groups = Array.isArray(claims?.groups) ? (claims.groups as string[]) : [];
    const roles = Array.isArray(claims?.roles) ? (claims.roles as string[]) : [];

    return {
        id: account.localAccountId || (claims?.sub as string) || account.homeAccountId,
        uniqueId: userName,
        username: userName,
        displayName: (claims?.name as string) || account.name || userName,
        email: (claims?.email as string) || account.username || undefined,
        tenantId: account.tenantId,
        roles,
        groups,
        raw: {
            ...account,
            idTokenClaims: claims,
        },
    };
};

export class EntraIdAuthProvider implements IAuthProvider {
    private msalInstance: PublicClientApplication;
    private config: EntraIdConfig;
    private state: AuthState = { ...INITIAL_AUTH_STATE };
    private listeners = new Set<AuthStateChangeCallback>();
    private refreshInterval: ReturnType<typeof setInterval> | null = null;
    private initPromise: Promise<void> | null = null;
    private loginInProgress = false;
    private pendingUserSnowDetails: Promise<UserSnowDetails> | null = null;

    constructor() {
        const cfg = appConfig.auth.entraId;
        if (!cfg) {
            throw new Error('Entra ID configuration is missing in auth config');
        }
        this.config = cfg;
        this.msalInstance = new PublicClientApplication(buildMsalConfig(cfg));
    }

    async revokeAccessToken(): Promise<void> {
        const account = this.msalInstance.getActiveAccount();
        if (!account) return;
        try {
            for (let i = sessionStorage.length - 1; i >= 0; i--) {
                const key = sessionStorage.key(i);
                if (key && key.includes('accesstoken') && key.includes(account.homeAccountId)) {
                    sessionStorage.removeItem(key);
                }
            }
            logger.debug('EntraID access token removed from session cache');
        } catch (error) {
            logger.warn('EntraID revokeAccessToken failed to clear cache', error);
        }
    }

    async revokeRefreshToken(): Promise<void> {
        const account = this.msalInstance.getActiveAccount();
        if (!account) return;
        try {
            for (let i = sessionStorage.length - 1; i >= 0; i--) {
                const key = sessionStorage.key(i);
                if (key && key.includes('refreshtoken') && key.includes(account.homeAccountId)) {
                    sessionStorage.removeItem(key);
                }
            }
            logger.debug('EntraID refresh token removed from session cache');
        } catch (error) {
            logger.warn('EntraID revokeRefreshToken failed to clear cache', error);
        }
    }

    async initialize(): Promise<void> {
        if (this.initPromise) return this.initPromise;
        this.initPromise = this.doInit();
        return this.initPromise;
    }

    private async doInit(): Promise<void> {
        try {
            await this.msalInstance.initialize();

            const response = await this.msalInstance.handleRedirectPromise();

            if (response?.account) {
                this.msalInstance.setActiveAccount(response.account);
            } else if (!this.msalInstance.getActiveAccount() && this.msalInstance.getAllAccounts().length > 0) {
                this.msalInstance.setActiveAccount(this.msalInstance.getAllAccounts()[0]);
            }

            cleanEntraIdUrlParams();

            this.msalInstance.addEventCallback((event) => {
                try {
                    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
                        const { account } = event.payload as AuthenticationResult;
                        if (account) {
                            this.msalInstance.setActiveAccount(account);
                            this.setupTokenRefresh();
                        }
                    }

                    if (event.eventType === EventType.ACTIVE_ACCOUNT_CHANGED && event.payload) {
                        const account = event.payload as AccountInfo;
                        if (account) {
                            this.setupTokenRefresh();
                        }
                    }

                    if (event.eventType === EventType.HANDLE_REDIRECT_END) {
                        cleanEntraIdUrlParams();
                    }

                    if (event.eventType === EventType.ACQUIRE_TOKEN_FAILURE) {
                        logger.warn('EntraID acquire token failed via event callback', event.error);
                    }

                    this.refreshState();
                } catch (error) {
                    logger.error('EntraID event callback failed', error);
                    this.setState({
                        ...this.state,
                        error: error instanceof Error ? error : new Error(String(error)),
                    });
                }
            });

            // Re-auth on tab focus after inactivity
            document.addEventListener('visibilitychange', async () => {
                if (document.visibilityState !== 'visible') return;
                const account = this.msalInstance.getActiveAccount();
                if (!account) return;

                try {
                    await this.msalInstance.acquireTokenSilent({
                        account,
                        scopes: getSessionHeartbeatScopes(this.config),
                    });
                    logger.debug('Token silently refreshed on tab focus');
                } catch {
                    logger.warn('Tab focus token refresh failed - session expired');
                    this.setState({
                        ...this.state,
                        sessionExpired: true,
                        error: new Error('Your session has expired. Please re-authenticate or logout.'),
                    });
                }
            });

            const activeAccount = this.msalInstance.getActiveAccount();
            const authenticated = !!activeAccount;

            if (authenticated) {
                this.setupTokenRefresh();
            }

            this.setState({
                isInitialized: true,
                isLoading: false,
                isAuthenticated: authenticated,
                sessionExpired: false,
                user: authenticated ? mapAccount(activeAccount) : null,
                error: null,
            });
        } catch (error: unknown) {
            cleanEntraIdUrlParams();
            const msg = error instanceof Error ? error.message : String(error);
            logger.error('EntraID initialization failed:', msg, error);
            this.setState({
                isInitialized: true,
                isLoading: false,
                isAuthenticated: false,
                sessionExpired: false,
                user: null,
                error: new Error(msg),
            });
        }
    }

    async login(): Promise<void> {
        if (this.loginInProgress) return;
        this.loginInProgress = true;
        this.setState({ ...this.state, isLoading: true, error: null });
        try {
            await this.msalInstance.loginRedirect(buildLoginRequest(this.config));
        } catch (error) {
            this.loginInProgress = false;
            logger.error('EntraID login failed', error);
            this.setState({
                ...this.state,
                isLoading: false,
                error: error instanceof Error ? error : new Error(String(error)),
            });
        }
    }

    async logout(): Promise<void> {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        try {
            await this.msalInstance.logoutRedirect({
                postLogoutRedirectUri: this.config.postLogoutRedirectUri,
            });
        } catch (error) {
            logger.error('EntraID logout failed', error);
            this.setState({
                ...this.state,
                error: error instanceof Error ? error : new Error(String(error)),
            });
        }
    }

    getUser(): AuthUser | null {
        const account = this.msalInstance.getActiveAccount();
        return account ? mapAccount(account) : null;
    }

    async getUserMemberOfGroups(): Promise<Array<string>> {
        await this.initialize();
        const account = this.msalInstance.getActiveAccount();
        if (!account) return [];
        const claims = account.idTokenClaims as Record<string, unknown> | undefined;
        return Array.isArray(claims?.groups) ? (claims.groups as string[]) : [];
    }

    hasGroupMembership(group: string): boolean {
        const account = this.msalInstance.getActiveAccount();
        const claims = account?.idTokenClaims as Record<string, unknown> | undefined;
        const groups = Array.isArray(claims?.groups) ? (claims.groups as string[]) : (this.state.user?.groups ?? []);
        return groups.includes(group);
    }

    private resolveScopes(targetOrScopes?: AuthResourceTarget | string[]): string[] {
        if (Array.isArray(targetOrScopes)) {
            return targetOrScopes;
        }
        if (targetOrScopes && targetOrScopes in this.config.scopes) {
            return this.config.scopes[targetOrScopes];
        }
        return this.config.scopes.default ?? [];
    }

    async getAccessToken(targetOrScopes?: AuthResourceTarget | string[]): Promise<string> {
        const account = this.msalInstance.getActiveAccount();
        if (!account) {
            const error = new Error('Your session has expired. Please re-authenticate or logout.');
            logger.error('EntraID getAccessToken failed - no active account', error);
            this.setState({ ...this.state, sessionExpired: true, error });
            throw error;
        }

        const effectiveScopes = this.resolveScopes(targetOrScopes);

        if (effectiveScopes.length === 0) {
            logger.debug(`EntraID: No scopes configured for target '${String(targetOrScopes)}', returning empty token`);
            return '';
        }

        try {
            const response = await this.msalInstance.acquireTokenSilent({ account, scopes: effectiveScopes });
            return response.accessToken;
        } catch (silentErr) {
            logger.warn('EntraID silent token acquisition failed, trying ssoSilent', silentErr);

            // 1. Try ssoSilent - recovers expired server sessions (302 case)
            try {
                const response = await this.msalInstance.ssoSilent({ ...buildLoginRequest(this.config), scopes: effectiveScopes });
                if (response?.account) {
                    this.msalInstance.setActiveAccount(response.account);
                }
                return response.accessToken;
            } catch (ssoErr) {
                logger.warn('ssoSilent failed, falling back to redirect', ssoErr);
            }

            // 2. Both failed - session is dead
            const error = new Error('Your session has expired. Please re-authenticate or logout.');
            this.setState({ ...this.state, sessionExpired: true, error });
            throw error;
        }
    }

    async getkeycloakIdapBrokerAccessToken(): Promise<string> {
        return this.getAccessToken();
    }

    async getRefreshToken(): Promise<string> {
        const account = this.msalInstance.getActiveAccount();
        if (!account) {
            const error = new Error('Your session has expired. Please re-authenticate or logout.');
            logger.error('EntraID getRefreshToken failed - no active account', error);
            this.setState({ ...this.state, sessionExpired: true, error });
            throw error;
        }

        try {
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.includes('refreshtoken') && key.includes(this.config.clientId)) {
                    const item = sessionStorage.getItem(key);
                    if (item) {
                        const parsed = JSON.parse(item);
                        if (parsed.secret) {
                            return parsed.secret as string;
                        }
                    }
                }
            }
        } catch {
            // Ignore parse errors
        }

        return '';
    }

    async refreshToken(targetOrScopes?: AuthResourceTarget | string[]): Promise<string> {
        const account = this.msalInstance.getActiveAccount();
        if (!account) {
            const error = new Error('Your session has expired. Please re-authenticate or logout.');
            logger.error('EntraID refreshToken failed - no active account', error);
            this.setState({ ...this.state, sessionExpired: true, error });
            throw error;
        }

        const effectiveScopes = targetOrScopes ? this.resolveScopes(targetOrScopes) : getSessionHeartbeatScopes(this.config);

        if (effectiveScopes.length === 0) {
            logger.debug(`EntraID: No scopes configured for refreshToken target '${String(targetOrScopes)}', returning empty token`);
            return '';
        }

        try {
            const response = await this.msalInstance.acquireTokenSilent({
                account,
                scopes: effectiveScopes,
                forceRefresh: true,
            });
            this.setState({ ...this.state, sessionExpired: false, error: null });
            this.refreshState();
            return response.accessToken;
        } catch (silentErr) {
            logger.warn('EntraID token refresh failed, trying ssoSilent', silentErr);

            try {
                const response = await this.msalInstance.ssoSilent({ ...buildLoginRequest(this.config), scopes: effectiveScopes });
                if (response?.account) {
                    this.msalInstance.setActiveAccount(response.account);
                }
                this.setState({ ...this.state, sessionExpired: false, error: null });
                this.refreshState();
                return response.accessToken;
            } catch (ssoErr) {
                logger.warn('ssoSilent failed - session expired', ssoErr);
            }

            const error = new Error('Your session has expired. Please re-authenticate or logout.');
            this.setState({ ...this.state, sessionExpired: true, error });
            throw error;
        }
    }

    async getUserSnowDetails(): Promise<UserSnowDetails> {
        if (this.state.user?.userSnowDetails) {
            return this.state.user.userSnowDetails;
        }

        if (this.pendingUserSnowDetails) {
            return this.pendingUserSnowDetails;
        }

        const account = this.msalInstance.getActiveAccount();

        if (!account) {
            const error = new Error('No active Entra ID session');
            logger.error('Failed to fetch user ServiceNow details', error);
            this.setState({ ...this.state, error });
            throw error;
        }

        const claims = account?.idTokenClaims as Record<string, unknown> | undefined;
        const serviceNowUniqueKey = (claims?.[appConfig.userServiceNowUserIDKeyInAuth] as string) || this.state.user?.uniqueId || this.state.user?.username;

        if (!serviceNowUniqueKey || typeof serviceNowUniqueKey !== 'string') {
            const error = new Error(`Unable to retrive userServiceNowUniqueIdKeyName from Entra ID account details`);
            logger.error('Failed to fetch user ServiceNow details', error);
            this.setState({ ...this.state, error });
            throw error;
        }

        this.pendingUserSnowDetails = fetchUserServiceNowDetails({ queryKey: appConfig.servicenowSysUserQueryKey, queryValue: serviceNowUniqueKey })
            .then((userDetails) => {
                const currentUser = this.state.user;
                if (!currentUser) throw new Error('No authenticated user');

                this.setState({
                    ...this.state,
                    user: {
                        ...currentUser,
                        userSnowDetails: { ...userDetails },
                    },
                });

                return userDetails;
            })
            .catch((error) => {
                const msg = error instanceof Error ? error.message : String(error);
                logger.error('Failed to fetch user ServiceNow details:', msg);
                this.setState({
                    ...this.state,
                    error: error instanceof Error ? error : new Error(msg),
                });
                throw error;
            })
            .finally(() => {
                this.pendingUserSnowDetails = null;
            });

        return this.pendingUserSnowDetails;
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

    private setupTokenRefresh(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        this.refreshInterval = setInterval(async () => {
            const account = this.msalInstance.getActiveAccount();
            if (!account) return;

            try {
                // MSAL acquireTokenSilent automatically validates expiry and refreshes if needed
                await this.msalInstance.acquireTokenSilent({
                    account,
                    scopes: getSessionHeartbeatScopes(this.config),
                });
                logger.debug('EntraID token refresh check succeeded');
                this.refreshState();
            } catch {
                logger.error('EntraID token refresh failed - retrying with force refresh');
                try {
                    await this.msalInstance.acquireTokenSilent({
                        account,
                        scopes: getSessionHeartbeatScopes(this.config),
                        forceRefresh: true,
                    });
                    logger.debug('EntraID token force-refreshed');
                    this.refreshState();
                } catch {
                    logger.error('EntraID token recovery failed - session expired');
                    if (this.refreshInterval) {
                        clearInterval(this.refreshInterval);
                        this.refreshInterval = null;
                    }
                    this.setState({
                        ...this.state,
                        sessionExpired: true,
                        error: new Error('Your session has expired. Please re-authenticate or logout.'),
                    });
                }
            }
        }, 30_000);
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
