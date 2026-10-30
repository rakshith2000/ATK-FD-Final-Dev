import { useQuery } from '@tanstack/react-query';
import type { QuizListResponse, QuizListUserStatistics } from '../types/train-ai';
import fetchQuizListForUser from '../services/fetch-quiz-list-for-user';

export const useQuizListQuery = () => {
    const queryKey = ['quiz-list-for-user'] as const;

    const query = useQuery<QuizListResponse, Error, QuizListUserStatistics>({
        queryKey,
        queryFn: fetchQuizListForUser,
        retry: false,
        staleTime: 5 * 60 * 1000,
        select: (quizList) => {
            const total = quizList.length;
            const passed = quizList.filter((q) => q.remarks?.toLowerCase() === 'pass').length;
            const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
            const firstAttemptPass = quizList.filter((q) => q.score >= 80).length;
            const avgScore = total > 0 ? Math.round(quizList.reduce((sum, q) => sum + (q.score ?? 0), 0) / total) : 0;

            return { total, passed, passRate, firstAttemptPass, avgScore, quizList };
        },
    });

    return { ...query, queryKey };
};
