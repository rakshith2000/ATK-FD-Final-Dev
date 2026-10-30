import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import axios from 'axios';
import trimTrailingSlashes from '../utils/trim-url-trailing-slashes';
import { getAuthProviderInstance } from '../utils/get-auth-provider-instance';

export const revokeUserKeycloakRefreshToken = async (): Promise<void> => {
    return withApiResponseHandler<void>(async () => {
        if (!appConfig.auth.keycloak) {
            throw new Error('Keycloak configuration is missing in auth config');
        }
        const authInstance = getAuthProviderInstance();
        authInstance.initialize(); // Ensure the auth instance is initialized before getting the refresh token
        const refreshToken = await authInstance.getRefreshToken();
        await axios.post(
            `${trimTrailingSlashes(appConfig.auth.keycloak.url)}/realms/${appConfig.auth.keycloak.realm}/protocol/openid-connect/revoke`,
            {
                client_id: appConfig.auth.keycloak.clientId,
                token: refreshToken,
                token_type_hint: 'refresh_token',
            },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        );
    });
};
