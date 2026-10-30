import { useQuery } from '@tanstack/react-query';
import fetchLiteLLMProxyList from '../services/fetch-lite-llm-proxy-list';
import type { LiteLLMProxy } from '../types/lite-llm-proxy';

export const useLiteLLMProxyListQuery = () => {
    const queryKey = ['lite-llm-proxy-list'];
    const query = useQuery<LiteLLMProxy, Error>({
        queryKey: [...queryKey],
        queryFn: fetchLiteLLMProxyList,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
};
