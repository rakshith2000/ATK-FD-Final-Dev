import { createContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import type { AuthResourceTarget, AuthState, AuthUser, IAuthProvider, UserSnowDetails } from '../types/auth';
import { getAuthProviderInstance } from '../utils/get-auth-provider-instance';
import logger from '@/shared/utils/logger';

export const INITIAL_AUTH_STATE: AuthState = {
    isInitialized: false,
    isLoading: true,
    isAuthenticated: false,
    sessionExpired: false,
    user: null,
    error: null,
};

export interface AuthContextValue {
    state: AuthState;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getAccessToken: (targetOrScopes?: AuthResourceTarget | string[]) => Promise<string>;
    getRefreshToken: () => Promise<string>;
    refreshToken: (targetOrScopes?: AuthResourceTarget | string[]) => Promise<string>;
    revokeAccessToken: () => Promise<void>;
    revokeRefreshToken: () => Promise<void>;
    getUser: () => AuthUser | null;
    getUserSnowDetails: () => Promise<UserSnowDetails>;
    hasGroupMembership: (group: string) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [provider] = useState<IAuthProvider>(() => getAuthProviderInstance());
    const [state, setState] = useState<AuthState>(INITIAL_AUTH_STATE);

    useEffect(() => {
        logger.debug('AuthProvider: initializing auth provider');
        provider.initialize();
        const unsubscribe = provider.subscribe(setState);
        return unsubscribe;
    }, [provider]);

    const value = useMemo<AuthContextValue>(
        () => ({
            state,
            login: () => provider.login(),
            logout: () => provider.logout(),
            getAccessToken: (scopes) => provider.getAccessToken(scopes),
            getRefreshToken: () => provider.getRefreshToken(),
            refreshToken: (targetOrScopes) => provider.refreshToken(targetOrScopes),
            revokeAccessToken: () => provider.revokeAccessToken(),
            revokeRefreshToken: () => provider.revokeRefreshToken(),
            getUser: () => provider.getUser(),
            getUserSnowDetails: () => provider.getUserSnowDetails(),
            hasGroupMembership: (group) => provider.hasGroupMembership(group),
        }),
        [state, provider],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
