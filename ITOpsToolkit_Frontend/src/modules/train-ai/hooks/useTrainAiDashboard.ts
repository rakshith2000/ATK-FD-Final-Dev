import { useMemo } from 'react';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import { useQuizzesQuery } from './useQuizzesQuery';
import { useQuizListQuery } from './useQuizListQuery';
import { computeDashboardStats } from '../utils/compute-dashboard-stats';
import { resolveCurrentUserId } from '../utils/resolve-current-user-id';

/**
 * Smart data hook for the Train AI dashboard.
 *
 * Data sources:
 * - `quizzesQuery` (GET /list_all_quizzes) → community-wide list. Drives the
 *   "Community stats" section, the leaderboard rank shown in the hero, and the
 *   topic / achievement panels.
 * - `userStatsQuery` (GET /list_all_quizzes_for_user) → the signed-in user's
 *   own quizzes, already reduced to the "My Stats" metrics. Drives the
 *   "My Stats" section only.
 *
 * UI components stay presentational — they only consume the returned queries.
 */
export function useTrainAiDashboard() {
    const { state } = useAuth();
    const quizzesQuery = useQuizzesQuery();
    const userStatsQuery = useQuizListQuery();

    const records = useMemo(() => quizzesQuery.data ?? [], [quizzesQuery.data]);

    const currentUserId = useMemo(() => resolveCurrentUserId(state.user, records), [state.user, records]);

    const stats = useMemo(() => computeDashboardStats(records, currentUserId), [records, currentUserId]);

    return { quizzesQuery, userStatsQuery, stats, currentUserId };
}
