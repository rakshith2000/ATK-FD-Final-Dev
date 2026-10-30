import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';

const fetchSnowDictionaries = async (searchTerm: string) => {
    const queryParts = ['nameISNOTEMPTY'];
    if (searchTerm.trim()) {
        queryParts.push(`nameSTARTSWITH${searchTerm}`);
    }
    const res = await serviceNowApiClient.get('/api/now/table/sys_db_object', {
        params: {
            sysparm_fields: 'name',
            sysparm_query: queryParts.join('^'),
            sysparm_limit: '100',
        },
    });
    const results = (res.data?.result ?? []) as { name: string; label?: string }[];
    return results
        .map((r) => ({
            label: r.name,
            value: r.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
};

export default fetchSnowDictionaries;
