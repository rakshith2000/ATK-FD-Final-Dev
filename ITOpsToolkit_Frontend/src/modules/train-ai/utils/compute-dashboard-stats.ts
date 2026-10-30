import { ACHIEVEMENTS, PASS_STATUSES, PERFECT_SCORE, QUESTIONS_PER_QUIZ } from '../constants/achievements';
import type { CommunityAward, LearnerMetrics, QuizRecord, ResolvedAchievement, RoomToGrowTopic, TopicParticipation, TopicPassStat, TrainAiDashboardStats } from '../types/train-ai';

/** Whether a record's `status` counts as a pass (case/space insensitive). */
export function isPassStatus(status: string): boolean {
    return PASS_STATUSES.includes(status?.trim().toLowerCase());
}

function roundPct(numerator: number, denominator: number): number {
    if (denominator <= 0) return 0;
    return Math.round((numerator / denominator) * 100);
}

/** Compute the raw (pre-points) metrics for a single learner's records. */
function computeLearnerMetrics(userId: string, records: QuizRecord[]): LearnerMetrics {
    const quizzesTaken = records.length;
    const quizzesPassed = records.filter((r) => isPassStatus(r.status)).length;
    const perfectScores = records.filter((r) => r.score >= PERFECT_SCORE).length;
    const averageScore = quizzesTaken > 0 ? Math.round(records.reduce((sum, r) => sum + (r.score ?? 0), 0) / quizzesTaken) : 0;
    const topicsAttempted = new Set(records.map((r) => r.category).filter(Boolean)).size;

    // A quiz cleared on the learner's only attempt for that quiz_code counts as
    // a first-attempt pass (no attempt ordering exists in the data).
    const attemptsByQuiz = new Map<string, number>();
    for (const r of records) {
        attemptsByQuiz.set(r.quiz_code, (attemptsByQuiz.get(r.quiz_code) ?? 0) + 1);
    }
    const firstAttemptPass = records.filter((r) => isPassStatus(r.status) && attemptsByQuiz.get(r.quiz_code) === 1).length;

    return {
        userId,
        quizzesTaken,
        quizzesPassed,
        passRate: roundPct(quizzesPassed, quizzesTaken),
        averageScore,
        firstAttemptPass,
        perfectScores,
        topicsAttempted,
        totalPoints: 0,
    };
}

/** Sum of point rewards for every achievement a learner has unlocked. */
function computeTotalPoints(metrics: LearnerMetrics): number {
    return ACHIEVEMENTS.reduce((sum, def) => (def.getProgress(metrics) >= def.target ? sum + def.points : sum), 0);
}

/**
 * Turn the flat quiz list into the complete dashboard model. Pure and
 * deterministic — safe to memoize on `(records, currentUserId)`.
 */
export function computeDashboardStats(records: QuizRecord[], currentUserId: string): TrainAiDashboardStats {
    const totalQuizzes = records.length;

    // --- Group by learner and compute per-learner metrics (incl. points) ---
    const recordsByUser = new Map<string, QuizRecord[]>();
    for (const record of records) {
        const list = recordsByUser.get(record.user_id) ?? [];
        list.push(record);
        recordsByUser.set(record.user_id, list);
    }

    const learnerMetrics = Array.from(recordsByUser.entries()).map(([userId, userRecords]) => {
        const metrics = computeLearnerMetrics(userId, userRecords);
        metrics.totalPoints = computeTotalPoints(metrics);
        return metrics;
    });

    // --- Current user metrics + rank ---
    const currentMetrics = learnerMetrics.find((m) => m.userId === currentUserId) ?? computeLearnerMetrics(currentUserId, []);
    if (!recordsByUser.has(currentUserId)) {
        currentMetrics.totalPoints = computeTotalPoints(currentMetrics);
    }

    const ranked = [...learnerMetrics].sort((a, b) => b.totalPoints - a.totalPoints || b.averageScore - a.averageScore);
    const rankIndex = ranked.findIndex((m) => m.userId === currentUserId);
    const rank = rankIndex >= 0 ? rankIndex + 1 : ranked.length + 1;

    // --- Achievements resolved for the current user ---
    const achievements: ResolvedAchievement[] = ACHIEVEMENTS.map((def) => {
        const current = Math.min(def.getProgress(currentMetrics), def.target);
        return {
            id: def.id,
            label: def.label,
            description: def.description,
            icon: def.icon,
            points: def.points,
            target: def.target,
            current,
            unlocked: def.getProgress(currentMetrics) >= def.target,
        };
    });

    const unlockedCount = achievements.filter((a) => a.unlocked).length;
    const lockedPoints = achievements.filter((a) => !a.unlocked).map((a) => a.points);
    const nextReward = lockedPoints.length > 0 ? Math.min(...lockedPoints) : null;

    // --- Community awards (learners that unlocked each achievement) ---
    const communityAwards: CommunityAward[] = ACHIEVEMENTS.map((def) => ({
        id: def.id,
        label: def.label,
        icon: def.icon,
        earnedCount: learnerMetrics.filter((m) => def.getProgress(m) >= def.target).length,
    }))
        .filter((award) => award.earnedCount > 0)
        .sort((a, b) => b.earnedCount - a.earnedCount)
        .slice(0, 3);

    // --- Topic aggregates ---
    const topicGroups = new Map<string, QuizRecord[]>();
    for (const record of records) {
        const topic = record.category || 'Uncategorized';
        const list = topicGroups.get(topic) ?? [];
        list.push(record);
        topicGroups.set(topic, list);
    }

    const topTopics: TopicParticipation[] = Array.from(topicGroups.entries())
        .map(([topic, list]) => ({ topic, count: list.length }))
        .sort((a, b) => b.count - a.count);

    const passByTopic: TopicPassStat[] = Array.from(topicGroups.entries())
        .map(([topic, list]) => ({
            topic,
            averageScore: Math.round(list.reduce((sum, r) => sum + (r.score ?? 0), 0) / list.length),
            passRate: roundPct(list.filter((r) => isPassStatus(r.status)).length, list.length),
            attempts: list.length,
        }))
        .sort((a, b) => b.averageScore - a.averageScore);

    // Topics where the community pass rate leaves easy wins on the table.
    const roomToGrow: RoomToGrowTopic[] = passByTopic
        .filter((t) => t.passRate < 100)
        .sort((a, b) => a.passRate - b.passRate)
        .slice(0, 5)
        .map((t) => ({
            topic: t.topic,
            hint: t.passRate >= 70 ? 'Quick wins available' : t.passRate >= 40 ? 'Room to improve' : 'Needs attention',
        }));

    // --- Community stats ---
    const communityPassed = records.filter((r) => isPassStatus(r.status)).length;
    const communityFirstAttemptSuccess = learnerMetrics.reduce((sum, m) => sum + m.firstAttemptPass, 0);
    const knowledgeArticles = new Set(records.flatMap((r) => r.kb_numbers ?? [])).size;

    return {
        hasRecords: totalQuizzes > 0,
        user: {
            quizzesTaken: currentMetrics.quizzesTaken,
            totalQuizzes,
            quizzesPassed: currentMetrics.quizzesPassed,
            passRate: currentMetrics.passRate,
            firstAttemptPass: currentMetrics.firstAttemptPass,
            averageScore: currentMetrics.averageScore,
            totalPoints: currentMetrics.totalPoints,
            rank,
        },
        community: {
            totalQuizzes,
            learners: recordsByUser.size,
            passRate: roundPct(communityPassed, totalQuizzes),
            firstAttemptSuccess: communityFirstAttemptSuccess,
            firstAttemptPercentage: roundPct(communityFirstAttemptSuccess, communityPassed),
            totalQuestions: totalQuizzes * QUESTIONS_PER_QUIZ,
            knowledgeArticles,
        },
        topTopics,
        passByTopic,
        communityAwards,
        achievements,
        unlockedCount,
        totalAchievements: ACHIEVEMENTS.length,
        totalPoints: currentMetrics.totalPoints,
        nextReward,
        roomToGrow,
    };
}
