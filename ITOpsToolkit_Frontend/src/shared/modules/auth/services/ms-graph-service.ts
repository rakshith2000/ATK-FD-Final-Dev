import axios from 'axios';
import { handlePromiseResponseHOF } from '@/shared/utils/handle-promise-response-hof';
import logger from '@/shared/utils/logger';

export const fetchMe = async (accessToken: string): Promise<unknown> => {
    return handlePromiseResponseHOF(async () => {
        const response = await axios.get('https://graph.microsoft.com/v1.0/me?$select=displayName,employeeId,department,companyName,officeLocation,mail,userPrincipalName', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        logger.debug('MS Graph /me Response Status:', response.status);
        logger.debug('MS Graph /me Response:', response.data);

        return response.data;
    });
};
