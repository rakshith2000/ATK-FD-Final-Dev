import { useQuery } from '@tanstack/react-query';
import type { LLM } from '../types/llms';
import fetchLLMsListConfig from '../services/fetch-llms-list-with-config';

export const useLLMsListWithConfigQuery = () => {
    const queryKey = ['llms-list-with-config'];
    const query = useQuery<Array<LLM>, Error>({
        queryKey: [...queryKey],
        queryFn: fetchLLMsListConfig,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
};
