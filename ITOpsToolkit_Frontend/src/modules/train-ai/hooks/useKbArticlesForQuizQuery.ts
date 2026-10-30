import { useQuery } from '@tanstack/react-query';
import type { NewQuizKbArticlesResponse } from '../types/train-ai';
import fetchKbArticlesForQuiz from '../services/fetch-kb-articles-for-quiz';

export const useKbArticlesForQuizQuery = () => {
    const queryKey = ['kb-articles-for-quiz'] as const;

    const query = useQuery<NewQuizKbArticlesResponse, Error>({
        queryKey,
        queryFn: fetchKbArticlesForQuiz,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
};
