import { useQuery } from '@tanstack/react-query';
import type { LLMTsListResponse } from '../types/llms';
import fetchLLMsList from '../services/fetch-llms-list';

type LLMTagOption = { label: string; value: string };

export const useLLMTagOptionsQuery = () => {
    const queryKey = ['llms-tags-options-list'] as const;

    const query = useQuery<LLMTsListResponse, Error, LLMTagOption[]>({
        queryKey,
        queryFn: fetchLLMsList,
        retry: false,
        staleTime: 5 * 60 * 1000,
        select: (data) => data.map((item) => ({ label: `${item.llm_tag} (${item.llm_type})`, value: item.llm_tag })),
    });

    return { ...query, queryKey };
};
