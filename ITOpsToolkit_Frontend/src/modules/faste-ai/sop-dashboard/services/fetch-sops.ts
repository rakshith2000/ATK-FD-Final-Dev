import ateAxios from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import type { SOP } from '../types/sop';

export const fetchSOPs = async (): Promise<SOP[]> => {
    return withApiResponseHandler<SOP[]>(async () => {
        const response = await ateAxios.get('/sops');

        if (Array.isArray(response.data)) {
            return response.data.filter((sop: SOP) => sop.is_approved === 'True');
        }

        throw new Error('Invalid SOP response format');
    });
};
