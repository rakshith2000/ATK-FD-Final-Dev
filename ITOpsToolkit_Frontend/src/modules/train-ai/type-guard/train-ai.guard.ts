import type { QuizRecord, QuizResponse } from '../types/train-ai';

// ============================================================================
// Generic helpers
// ============================================================================

function isStringArray(v: unknown): v is string[] {
    return Array.isArray(v) && v.every((item) => typeof item === 'string');
}

// ============================================================================
// GET /quizzes (QuizResponse)
// ============================================================================

function isQuizRecord(value: unknown): value is QuizRecord {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.quiz_code === 'string' &&
        typeof v.user_id === 'string' &&
        isStringArray(v.kb_numbers) &&
        typeof v.description === 'string' &&
        typeof v.score === 'number' &&
        typeof v.remarks === 'string' &&
        typeof v.category === 'string' &&
        typeof v.sub_category === 'string' &&
        typeof v.status === 'string'
    );
}

export function isQuizResponse(value: unknown): value is QuizResponse {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return Array.isArray(v.data) && v.data.every(isQuizRecord);
}
