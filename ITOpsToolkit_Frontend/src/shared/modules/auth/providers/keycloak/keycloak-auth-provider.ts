import Keycloak from 'keycloak-js';
import axios from 'axios';
import type { IAuthProvider, AuthUser, AuthState, AuthStateChangeCallback, UserSnowDetails } from '../../types/auth';
import { appConfig, type KeycloakConfig } from '@/config/app-config';
import logger from '@/shared/utils/logger';
import { INITIAL_AUTH_STATE } from '../../context/AuthContext';
import { appEnvConfig } from '@/config/app-env-config';
import { fetchUserServiceNowDetails } from '../../services/fetch-user-servicenow-details';
import trimTrailingSlashes from '../../utils/trim-url-trailing-slashes';
import { revokeUserKeycloakAccessToken } from '../../services/revoke-user-keycloak-access-token';
import { revokeUserKeycloakRefreshToken } from '../../services/revoke-user-keycloak-refresh-token';

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
        const error = new Error(`Unable to retrive userServiceNowUniqueIdKeyName from Keycloak token`);
        logger.error('Failed to fetch userServiceNowUniqueIdKeyName - userName from Keycloak token', error);
        throw error;
    }

    return {
        id: token.sub ?? '',
        uniqueId: userName ?? '',
        username: userName,
        displayName: ((token as Record<string, unknown>).name as string) ?? userName,
        email: (token as Record<string, unknown>).email as string | undefined,
        tenantId: keycloak.realm,
        roles: keycloak.realmAccess?.roles ?? [],
        groups: token?.groups ?? [],
        raw: {
            ...token,
            token: keycloak.token,
            refreshToken: keycloak.refreshToken,
        },
    };
};

const cleanKeycloakUrlParams = (): void => {
    const url = new URL(window.location.href);
    const paramsToRemove = ['state', 'session_state', 'code', 'error', 'error_description'];
    let modified = false;

    for (const param of paramsToRemove) {
        if (url.searchParams.has(param)) {
            url.searchParams.delete(param);
            modified = true;
        }
    }

    if (modified) {
        const cleanUrl = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') + url.hash;
        window.history.replaceState(window.history.state, document.title, cleanUrl);
    }
};

export class KeycloakAuthProvider implements IAuthProvider {
    private keycloak: Keycloak;
    private config: KeycloakConfig;
    private state: AuthState = { ...INITIAL_AUTH_STATE };
    private listeners = new Set<AuthStateChangeCallback>();
    private refreshInterval: ReturnType<typeof setInterval> | null = null;
    private initPromise: Promise<void> | null = null;
    private loginInProgress = false;
    private pendingUserSnowDetails: Promise<UserSnowDetails> | null = null;
    private pendingGetAccessTokenBasedOnIdap: Promise<string> | null = null;
    private accessTokenbasedOnIdap: string | null = null;

    constructor() {
        const cfg = appConfig.auth.keycloak;
        if (!cfg) {
            throw new Error('Keycloak configuration is missing in auth config');
        }
        this.config = cfg;
        this.keycloak = new Keycloak({
            url: trimTrailingSlashes(cfg.url),
            realm: cfg.realm,
            clientId: cfg.clientId,
        });
    }

    revokeAccessToken(): Promise<void> {
        return revokeUserKeycloakAccessToken();
    }

    revokeRefreshToken(): Promise<void> {
        return revokeUserKeycloakRefreshToken();
    }

    async initialize(): Promise<void> {
        if (this.initPromise) return this.initPromise;
        this.initPromise = this.doInit();
        return this.initPromise;
    }

    private async doInit(): Promise<void> {
        try {
            const authenticated = await this.keycloak.init({
                onLoad: 'login-required',
                pkceMethod: 'S256',
                checkLoginIframe: false,
                enableLogging: appEnvConfig.isInDevelopmentMode,
                useNonce: false,
            });

            // Prevent keycloak-js internal updateToken failure handler from auto-redirecting to login
            const kcInternal = this.keycloak as unknown as { initOptions?: { onLoad?: string }; onLoad?: string };
            if (kcInternal.initOptions) {
                kcInternal.initOptions.onLoad = undefined;
            }
            kcInternal.onLoad = undefined;

            cleanKeycloakUrlParams();

            this.keycloak.onAuthRefreshSuccess = () => {
                logger.debug('Keycloak onAuthRefreshSuccess: updating provider state with fresh tokens');
                this.refreshState();
            };

            this.keycloak.onAuthRefreshError = () => {
                logger.warn('Keycloak onAuthRefreshError triggered - session expired');
                this.setState({
                    ...this.state,
                    sessionExpired: true,
                    error: new Error('Your session has expired. Please re-authenticate or logout.'),
                });
            };

            if (authenticated) {
                this.setupTokenRefresh();

                if (appConfig.isInDemoEnvironment) {
                    const kcToken = await this.getAccessToken();
                    await axios.get(`${appConfig.serviceNow.api.baseUrl}/api/cogz/keycloak_proxy/incident`, {
                        headers: {
                            Authorization: `Bearer ${kcToken}`,
                        },
                    });
                }
            }

            this.setState({
                isInitialized: true,
                isLoading: false,
                isAuthenticated: authenticated,
                sessionExpired: false,
                user: authenticated ? extractUser(this.keycloak) : null,
                error: null,
            });
        } catch (error: unknown) {
            cleanKeycloakUrlParams();
            const errObj = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : null;

            // Handle login_required / unauthenticated check-sso response gracefully
            if (errObj?.error === 'login_required' || error === false) {
                logger.debug('Keycloak check-sso: no active session found (login required)');
                this.setState({
                    isInitialized: true,
                    isLoading: false,
                    isAuthenticated: false,
                    sessionExpired: false,
                    user: null,
                    error: null,
                });
                return;
            }

            const msg =
                error instanceof Error
                    ? error.message
                    : typeof errObj?.error_description === 'string'
                      ? errObj.error_description
                      : typeof errObj?.error === 'string'
                        ? errObj.error
                        : String(error);

            logger.error('Keycloak initialization failed:', msg, error);
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
            await this.keycloak.login({ redirectUri: this.config.redirectUri });
        } catch (error) {
            this.loginInProgress = false;
            logger.error('Keycloak login failed', error);
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
            await this.keycloak.logout({ redirectUri: this.config.postLogoutRedirectUri });
        } catch (error) {
            logger.error('Keycloak logout failed', error);
            this.setState({
                ...this.state,
                error: error instanceof Error ? error : new Error(String(error)),
            });
        }
    }

    getUser(): AuthUser | null {
        if (!this.keycloak.authenticated) return null;
        return extractUser(this.keycloak);
    }

    async getAccessToken(): Promise<string> {
        if (!this.keycloak.token) {
            const error = new Error('Your session has expired. Please re-authenticate or logout.');
            logger.error('Keycloak getAccessToken failed - no active session', error);
            this.setState({ ...this.state, sessionExpired: true, error });
            throw error;
        }

        try {
            await this.keycloak.updateToken(30);
            logger.debug('appConfig.auth.keycloak.identityProvider  : ', this.config.identityProvider);
            return this.keycloak.token;
        } catch {
            logger.warn('Keycloak token refresh failed - session expired');
            const error = new Error('Your session has expired. Please re-authenticate or logout.');
            this.setState({ ...this.state, sessionExpired: true, error });
            throw error;
        }
    }

    async getRefreshToken(): Promise<string> {
        if (!this.keycloak.refreshToken) {
            const error = new Error('Your session has expired. Please re-authenticate or logout.');
            logger.error('Keycloak getRefreshToken failed - no active session', error);
            this.setState({ ...this.state, sessionExpired: true, error });
            throw error;
        }

        try {
            await this.keycloak.updateToken(30);
            this.refreshState();
        } catch {
            logger.warn('Keycloak token refresh failed - session expired');
            const error = new Error('Your session has expired. Please re-authenticate or logout.');
            this.setState({ ...this.state, sessionExpired: true, error });
            throw error;
        }

        return this.keycloak.refreshToken;
    }

    async getUserMemberOfGroups(): Promise<Array<string>> {
        await this.initialize();
        return this.keycloak?.tokenParsed?.groups ?? [];
    }

    hasGroupMembership(group: string): boolean {
        const groups = this.keycloak?.tokenParsed?.groups ?? [];
        return groups.includes(group);
    }

    async refreshToken(): Promise<string> {
        if (!this.keycloak.token) {
            const error = new Error('Your session has expired. Please re-authenticate or logout.');
            logger.error('Keycloak refreshToken failed - no active session', error);
            this.setState({ ...this.state, sessionExpired: true, error });
            throw error;
        }

        try {
            await this.keycloak.updateToken(-1);
        } catch {
            logger.warn('Keycloak force refresh failed - session expired');
            const error = new Error('Your session has expired. Please re-authenticate or logout.');
            this.setState({ ...this.state, sessionExpired: true, error });
            throw error;
        }

        this.setState({ ...this.state, sessionExpired: false, error: null });
        this.refreshState();
        return this.keycloak.token;
    }

    async getUserSnowDetails(): Promise<UserSnowDetails> {
        logger.debug('getUserSnowDetails', this.state?.user?.userSnowDetails);

        if (this.state.user?.userSnowDetails) {
            return this.state.user.userSnowDetails;
        }

        if (this.pendingUserSnowDetails) {
            return this.pendingUserSnowDetails;
        }

        if (!this.keycloak.token) {
            const error = new Error('No active Keycloak session');
            logger.error('Failed to fetch user ServiceNow details', error);
            this.setState({ ...this.state, error });
            throw error;
        }

        const userServiceNowId = (this.state?.user?.raw as Record<string, unknown>)?.[appConfig.userServiceNowUserIDKeyInAuth];

        if (!userServiceNowId || typeof userServiceNowId !== 'string') {
            const error = new Error(`Unable to retrive ${appConfig.userServiceNowUserIDKeyInAuth} from Keycloak Raw token`);
            logger.error('Failed to fetch user ServiceNow details', error);
            this.setState({ ...this.state, error });
            throw error;
        }

        this.pendingUserSnowDetails = fetchUserServiceNowDetails({ queryKey: appConfig.servicenowSysUserQueryKey, queryValue: userServiceNowId })
            .then((userDetails) => {
                logger.debug('userDetails', userDetails);

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

    private setupTokenRefresh(): void {
        this.refreshInterval = setInterval(async () => {
            try {
                const refreshed = await this.keycloak.updateToken(120);
                if (refreshed) {
                    logger.debug('Keycloak token refreshed');
                    this.refreshState();
                }
            } catch {
                logger.error('Keycloak token refresh failed - retrying with force refresh');
                try {
                    const forceRefreshed = await this.keycloak.updateToken(-1); // force refresh
                    if (forceRefreshed) {
                        logger.debug('Keycloak token force-refreshed');
                        this.refreshState();
                    }
                } catch {
                    logger.error('Keycloak token recovery failed - session expired');
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

    async getkeycloakIdapBrokerAccessToken(): Promise<string> {
        if (this.accessTokenbasedOnIdap) {
            return this.accessTokenbasedOnIdap;
        }

        if (this.pendingGetAccessTokenBasedOnIdap) {
            return this.pendingGetAccessTokenBasedOnIdap;
        }

        const keycloakAccessToken = await this.getAccessToken();

        this.pendingGetAccessTokenBasedOnIdap = this.getAccessTokenBasedOnIdp({
            idp_alias: this.config.identityProviderAlias,
            keycloakAccessToken: keycloakAccessToken,
        })
            .then((idapAccessToken) => {
                this.accessTokenbasedOnIdap = idapAccessToken;

                return idapAccessToken;
            })
            .catch((error) => {
                const msg = error instanceof Error ? error.message : String(error);
                logger.error('Failed to fetch idap access token based on idap_alias :', msg);

                throw error;
            })
            .finally(() => {
                this.pendingGetAccessTokenBasedOnIdap = null;
            });

        return this.pendingGetAccessTokenBasedOnIdap;
    }

    private async getAccessTokenBasedOnIdp({ idp_alias, keycloakAccessToken }: { idp_alias: string; keycloakAccessToken: string }): Promise<string> {
        try {
            const url = `${this.keycloak.authServerUrl}/realms/${this.keycloak.realm}/broker/${idp_alias}/token`;
            logger.debug('getAccessTokenBasedOnIdp: fetching IDP token');
            const response = await axios.get<{ access_token?: string }>(url, {
                headers: {
                    Authorization: `Bearer ${keycloakAccessToken}`,
                },
            });

            const data = response.data;
            if (data?.access_token) {
                logger.debug('IDP token fetched successfully using axios', data);
                return data.access_token;
            }

            logger.warn('AD token fetch returned no access_token - falling back to Keycloak token');
            return keycloakAccessToken;
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                if (status === 404) {
                    logger.warn('IDP not found in Keycloak - falling back to Keycloak token');
                } else if (status === 401) {
                    logger.warn('User missing view-token role - falling back to Keycloak token');
                } else if (status === 400) {
                    logger.warn('User not linked to AD IDP - falling back to Keycloak token');
                } else {
                    logger.warn(`AD token fetch failed (${status}) - falling back to Keycloak token`);
                }
            } else {
                const msg = error instanceof Error ? error.message : String(error);
                logger.warn(`AD token fetch error: ${msg} - falling back to Keycloak token`);
            }
            return keycloakAccessToken;
        }
    }
}
