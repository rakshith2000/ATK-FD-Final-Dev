import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { appConfig } from '@/config/app-config';
import { isSnowUserCriteriaArray } from '../type-guards/access.guards';

const fetchSnowUserCriteriaIdsBySysId = async (userSysId: string): Promise<Array<string>> => {
    const response = await serviceNowApiClient.get(appConfig.serviceNow.api.knowledgeUserCriteria, {
        params: {
            sysparm_query: `userLIKE${userSysId}`,
            sysparm_fields: 'sys_id,name',
            sysparm_display_value: true,
        },
    });

    const results = response?.data?.result;
    if (!isSnowUserCriteriaArray(results)) {
        throw new Error('Unable to retrieve user criteria from Service Now, failed to validate the response JSON Schema !', {
            cause: { reason: 'response?.data?.result schema is invalid !' },
        });
    }

    return results.map((criteria) => criteria.sys_id).filter((sysId) => sysId.length > 0);
};

export default fetchSnowUserCriteriaIdsBySysId;
