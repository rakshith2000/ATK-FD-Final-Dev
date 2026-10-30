import type { LucideIcon } from 'lucide-react';

export interface TrainAiQuiz {
    quiz_code: string;
    user_id: string;
    kb_numbers: Array<string>;
    description: string;
    score: number;
    remarks: string;
    category: string;
    sub_category: string;
    status: string;
}

export type QuizListResponse = Array<TrainAiQuiz>;

export interface KbArticleField {
    display_value: string;
    value: string;
}
export type QuizListUserStatistics = {
    total: number;
    passed: number;
    passRate: number;
    firstAttemptPass: number;
    avgScore: number;
    quizList: QuizListResponse;
};
export interface KbArticleFieldWithLink extends KbArticleField {
    link: string;
}

export interface NewQuizKbArticle {
    sys_id: KbArticleField;
    number: KbArticleField;
    short_description: KbArticleField;
    kb_category: KbArticleField;
    sys_created_on: KbArticleField;
    author: KbArticleFieldWithLink;
    rating: KbArticleField;
    workflow_state: KbArticleField;
    text: KbArticleField;
}

export type NewQuizKbArticlesResponse = NewQuizKbArticle[];

export type QuizDifficultyLevel = 'Beginner' | 'Specialist' | 'Expert';

export interface GenerateQuizRequest {
    articles_number: string[];
    difficulty_level: QuizDifficultyLevel;
}

export interface GenerateQuizResponse {
    quiz_id: string;
    passing_threshold: number;
}

export interface QuizQuestion {
    question: string;
    choices: string[];
    user_response: string;
}

export interface GetMcqsResponse {
    start_time?: string;
    end_time: string;
    questions: QuizQuestion[];
}

export interface GetMcqsRequest {
    user_id: string;
    quiz_code: string;
    type_of_submit: 'start' | 'resume' | 'save' | 'submit';
}

export interface SubmitQuizRequest {
    user_id: string;
    quiz_code: string;
    type_of_submit: 'resume' | 'submit';
    questions: QuizQuestion[];
}

export interface SubmitQuizResponse {
    score: string;
    remarks: string;
}

export interface ConvHistoryItem {
    role: string;
    content: string;
}

export interface GenerateScenariosRequest {
    articles_number: string;
    conv_history: ConvHistoryItem[];
    previous_question: string[];
    prompt?: string;
}

export interface GenerateScenariosResponse {
    response: string;
    conv_history: ConvHistoryItem[];
}

export interface QuizRecord {
    quiz_code: string;
    user_id: string;
    kb_numbers: string[];
    description: string;
    score: number;
    remarks: string;
    category: string;
    sub_category: string;
    status: string;
}

export interface QuizResponse {
    data: QuizRecord[];
}

// ============================================================================
// Dashboard-derived types
//
// The API (GET /list_all_quizzes) returns a flat list of QuizRecord. Every
// metric shown on the Train AI dashboard is derived from that list on the
// client. The interfaces below describe the shape produced by
// `computeDashboardStats()`.
// ============================================================================

/** Per-learner metrics computed by grouping records on `user_id`. */
export interface LearnerMetrics {
    userId: string;
    quizzesTaken: number;
    quizzesPassed: number;
    /** Pass rate as a whole-number percentage (0-100). */
    passRate: number;
    /** Average `score` across the learner's records (0-100). */
    averageScore: number;
    /** Passed quizzes that the learner cleared on their only attempt. */
    firstAttemptPass: number;
    /** Number of records whose `score` is a perfect 100. */
    perfectScores: number;
    /** Distinct `category` values the learner has attempted. */
    topicsAttempted: number;
    /** Sum of the point rewards of every achievement the learner has unlocked. */
    totalPoints: number;
}

/** A single achievement/badge resolved for the current user. */
export interface ResolvedAchievement {
    id: string;
    label: string;
    description: string;
    /** Icon component used to represent the achievement. */
    icon: LucideIcon;
    points: number;
    target: number;
    current: number;
    unlocked: boolean;
}

/** Aggregated award earned across the whole community. */
export interface CommunityAward {
    id: string;
    label: string;
    icon: LucideIcon;
    /** How many distinct learners have unlocked this award. */
    earnedCount: number;
}

/** Participation count for a single topic (category). */
export interface TopicParticipation {
    topic: string;
    count: number;
}

/** Average score / pass rate for a single topic (category). */
export interface TopicPassStat {
    topic: string;
    averageScore: number;
    passRate: number;
    attempts: number;
}

/** A topic flagged as having easy improvement wins for the current user. */
export interface RoomToGrowTopic {
    topic: string;
    hint: string;
}

/** Stats scoped to the currently signed-in learner ("My Stats" section). */
export interface CurrentUserStats {
    quizzesTaken: number;
    totalQuizzes: number;
    quizzesPassed: number;
    passRate: number;
    firstAttemptPass: number;
    averageScore: number;
    totalPoints: number;
    /** 1-based rank of the current user among all learners by total points. */
    rank: number;
}

/** Stats scoped to the whole community ("Community stats" section). */
export interface CommunityStats {
    totalQuizzes: number;
    learners: number;
    passRate: number;
    firstAttemptSuccess: number;
    firstAttemptPercentage: number;
    totalQuestions: number;
    knowledgeArticles: number;
}

/** The complete, ready-to-render dashboard model. */
export interface TrainAiDashboardStats {
    hasRecords: boolean;
    user: CurrentUserStats;
    community: CommunityStats;
    topTopics: TopicParticipation[];
    passByTopic: TopicPassStat[];
    communityAwards: CommunityAward[];
    achievements: ResolvedAchievement[];
    unlockedCount: number;
    totalAchievements: number;
    totalPoints: number;
    nextReward: number | null;
    roomToGrow: RoomToGrowTopic[];
}
