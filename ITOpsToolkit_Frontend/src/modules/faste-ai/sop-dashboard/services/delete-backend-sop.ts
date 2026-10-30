import ateAxios from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';

export const deleteBackendSOP = async (sopId: number) => {
    return withApiResponseHandler(async () => {
        await ateAxios.delete(`/sops/${sopId}`);
    });
};
