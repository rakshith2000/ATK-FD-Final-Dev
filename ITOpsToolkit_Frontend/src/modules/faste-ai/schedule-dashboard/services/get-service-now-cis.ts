import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';

export const fetchServiceNowCis = async (): Promise<unknown> => {
    const endpoint = '/api/now/table/cmdb_ci_server';

    const response = await serviceNowApiClient.get(endpoint, {
        params: {
            sysparm_fields: 'name,sys_id',
        },
    });

    return response.data;
};
