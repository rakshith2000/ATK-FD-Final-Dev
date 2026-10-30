import type { IAuthProvider } from './types/auth';
import { appConfig } from '@/config/app-config';
import { EntraIdAuthProvider } from './providers/entra-id/entra-id-auth-provider';
import { KeycloakAuthProvider } from './providers/keycloak/keycloak-auth-provider';

export const createAuthProvider = (): IAuthProvider => {
    const providerType = appConfig.auth.provider;

    switch (providerType) {
        case 'entra-id':
            return new EntraIdAuthProvider();
        case 'keycloak':
            return new KeycloakAuthProvider();
        default:
            throw new Error(`Unknown auth provider: Check provider in auth config.`);
    }
};
