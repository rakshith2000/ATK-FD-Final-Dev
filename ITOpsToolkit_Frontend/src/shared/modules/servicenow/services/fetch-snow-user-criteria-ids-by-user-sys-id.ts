import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { appConfig } from '@/config/app-config';
import { appEnvConfig } from '@/config/app-env-config';
import { isSnowUserCriteriaArray } from '../type-guards/access.guards';

const DEMO_USER_SYS_ID = '5a75e9522f0cdb10ab179e2fafa4e332';
const DEMO_USER_CRITERIA_SYS_ID = 'fca8ac73c35fe550132b9fd4e40131e5';

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

    const criteriaIds = results.map((criteria) => criteria.sys_id).filter((sysId) => sysId.length > 0);

    if (appEnvConfig.isInDevelopmentMode && userSysId === DEMO_USER_SYS_ID && criteriaIds.length === 0) {
        return [DEMO_USER_CRITERIA_SYS_ID];
    }

    return criteriaIds;
};

export default fetchSnowUserCriteriaIdsBySysId;
