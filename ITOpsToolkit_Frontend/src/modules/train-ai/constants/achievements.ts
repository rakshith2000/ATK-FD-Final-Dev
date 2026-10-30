import type { LucideIcon } from 'lucide-react';
import { BookOpen, CheckCircle2, Compass, Crosshair, Flame, GraduationCap, Map, Percent, Rocket, Sparkles, Target, Trophy } from 'lucide-react';
import type { LearnerMetrics } from '../types/train-ai';

/**
 * Static definition of a single achievement/badge.
 *
 * `getProgress` returns the learner's current value for the achievement; a
 * badge is considered unlocked when that value reaches `target`. `points` is
 * awarded on unlock and feeds both "Total Points" and the leaderboard rank.
 */
export interface AchievementDef {
    id: string;
    label: string;
    description: string;
    icon: LucideIcon;
    points: number;
    target: number;
    getProgress: (metrics: LearnerMetrics) => number;
}

/**
 * Ordered to match the "Overall Progress" grid in the dashboard design.
 * Every metric is derived from the flat QuizRecord list, so achievements are
 * intentionally limited to what that data can support.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
    { id: 'first-step', label: 'First Step', description: 'Take 1 quiz', icon: Rocket, points: 50, target: 1, getProgress: (m) => m.quizzesTaken },
    { id: 'quiz-enthusiast', label: 'Quiz Enthusiast', description: 'Take 5 quizzes', icon: BookOpen, points: 100, target: 5, getProgress: (m) => m.quizzesTaken },
    { id: 'dedicated-learner', label: 'Dedicated Learner', description: 'Take 10 quizzes', icon: GraduationCap, points: 250, target: 10, getProgress: (m) => m.quizzesTaken },
    { id: 'first-win', label: 'First Win', description: 'Pass 1 quiz', icon: CheckCircle2, points: 75, target: 1, getProgress: (m) => m.quizzesPassed },
    { id: 'consistent', label: 'Consistent', description: 'Pass 5 quizzes', icon: Flame, points: 150, target: 5, getProgress: (m) => m.quizzesPassed },
    { id: 'sharp-shooter', label: 'Sharp Shooter', description: '1st-attempt pass ×1', icon: Target, points: 100, target: 1, getProgress: (m) => m.firstAttemptPass },
    { id: 'first-try-master', label: 'First-Try Master', description: '1st-attempt pass ×3', icon: Crosshair, points: 200, target: 3, getProgress: (m) => m.firstAttemptPass },
    { id: 'perfectionist', label: 'Perfectionist', description: 'Score 100% once', icon: Percent, points: 150, target: 1, getProgress: (m) => m.perfectScores },
    { id: 'triple-perfect', label: 'Triple Perfect', description: 'Score 100% three times', icon: Sparkles, points: 300, target: 3, getProgress: (m) => m.perfectScores },
    { id: 'explorer', label: 'Explorer', description: 'Attempt 3 topics', icon: Compass, points: 100, target: 3, getProgress: (m) => m.topicsAttempted },
    { id: 'diverse-learner', label: 'Diverse Learner', description: 'Attempt 5 topics', icon: Map, points: 200, target: 5, getProgress: (m) => m.topicsAttempted },
    {
        id: 'high-achiever',
        label: 'High Achiever',
        description: 'Pass rate ≥ 50%',
        icon: Trophy,
        points: 200,
        target: 50,
        getProgress: (m) => (m.quizzesTaken > 0 ? m.passRate : 0),
    },
];

/** Status values (case-insensitive) that count as a "pass". */
export const PASS_STATUSES = ['pass', 'passed', 'completed', 'complete', 'success', 'cleared', 'clear'];

/**
 * Questions per quiz. The API carries no per-question data, so "Total
 * Questions" is derived from the quiz count. Adjust here if the quiz format
 * changes.
 */
export const QUESTIONS_PER_QUIZ = 6;

/** A perfect score, used by the Perfectionist / Triple Perfect achievements. */
export const PERFECT_SCORE = 100;
