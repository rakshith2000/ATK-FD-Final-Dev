import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import type { UploadVaultConfigRequest, UploadVaultConfigResponse } from '../types/vault';

const uploadVaultConfig = async ({ payload }: { payload: UploadVaultConfigRequest }) => {
    return withApiResponseHandler<UploadVaultConfigResponse>(async () => {
        if (appConfig.isInDemoEnvironment) {
            return {
                message: appConfig.demoEnvironmentActionMessage,
            };
        }
        const formData = new FormData();

        formData.append('vault_env_file', payload.vault_env_file);

        const response = await backendApiClient.post(appConfig.backend.api.uploadVaultConfig, formData, {
            params: {
                vault_type: payload.vault_type,
            },
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (response?.data?.output?.message && typeof response?.data?.output?.message === 'string') {
            return { message: response.data.output?.message ?? '' };
        }

        throw new Error('Failed to validate the Upload Vault Config response from API response JSON Schema !', {
            cause: {
                reason: 'response?.data?.output?.message schema is invalid !',
            },
        });
    });
};

export default uploadVaultConfig;
