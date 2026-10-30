import ateAxios from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';

export const deleteVector = async (vectorId: number) => {
    return withApiResponseHandler(async () => {
        await ateAxios.delete(`/sops/vector/${vectorId}`);
    });
};
