import { useQuery } from '@tanstack/react-query';
import fetchQuizzes from '../services/fetch-quizzes';
import type { QuizRecord } from '../types/train-ai';

export function useQuizzesQuery({ enabled = true }: { enabled?: boolean } = {}) {
    const queryKey = ['trainAiQuizzes'];
    const query = useQuery<QuizRecord[], Error>({
        queryKey: queryKey,
        queryFn: fetchQuizzes,
        enabled,
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
}
