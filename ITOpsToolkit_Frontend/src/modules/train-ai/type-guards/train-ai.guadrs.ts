import type {
    GenerateQuizResponse,
    GenerateScenariosResponse,
    GetMcqsResponse,
    NewQuizKbArticlesResponse,
    QuizListResponse,
    QuizQuestion,
    SubmitQuizResponse,
} from '../types/train-ai';

const isKbArticleField = (value: unknown): boolean =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).display_value === 'string' &&
    typeof (value as Record<string, unknown>).value === 'string';

export function isNewQuizKbArticlesResponse(value: unknown): value is NewQuizKbArticlesResponse {
    return (
        Array.isArray(value) &&
        value.every(
            (item) =>
                typeof item === 'object' &&
                item !== null &&
                isKbArticleField((item as Record<string, unknown>).sys_id) &&
                isKbArticleField((item as Record<string, unknown>).number) &&
                isKbArticleField((item as Record<string, unknown>).short_description) &&
                isKbArticleField((item as Record<string, unknown>).kb_category),
        )
    );
}

export function isQuizListResponse(value: unknown): value is QuizListResponse {
    return (
        Array.isArray(value) &&
        value.every(
            (item) =>
                typeof item === 'object' &&
                item !== null &&
                typeof (item as Record<string, unknown>).quiz_code === 'string' &&
                typeof (item as Record<string, unknown>).user_id === 'string' &&
                Array.isArray((item as Record<string, unknown>).kb_numbers) &&
                ((item as Record<string, unknown>).kb_numbers as unknown[]).every((k) => typeof k === 'string') &&
                typeof (item as Record<string, unknown>).description === 'string' &&
                typeof (item as Record<string, unknown>).score === 'number' &&
                typeof (item as Record<string, unknown>).remarks === 'string' &&
                typeof (item as Record<string, unknown>).category === 'string' &&
                typeof (item as Record<string, unknown>).sub_category === 'string' &&
                typeof (item as Record<string, unknown>).status === 'string',
        )
    );
}

export function isGenerateQuizResponse(value: unknown): value is GenerateQuizResponse {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as Record<string, unknown>).quiz_id === 'string' &&
        typeof (value as Record<string, unknown>).passing_threshold === 'number'
    );
}

const isQuizQuestion = (value: unknown): boolean =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).question === 'string' &&
    Array.isArray((value as Record<string, unknown>).choices) &&
    ((value as Record<string, unknown>).choices as unknown[]).every((c) => typeof c === 'string') &&
    typeof (value as Record<string, unknown>).user_response === 'string';

export function isQuizQuestionsResponse(value: unknown): value is QuizQuestion[] {
    return Array.isArray(value) && value.every(isQuizQuestion);
}

export function isGetMcqsResponse(value: unknown): value is GetMcqsResponse {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as Record<string, unknown>).end_time === 'string' &&
        Array.isArray((value as Record<string, unknown>).questions) &&
        ((value as Record<string, unknown>).questions as unknown[]).every(isQuizQuestion)
    );
}

export function isGenerateScenariosResponse(value: unknown): value is GenerateScenariosResponse {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as Record<string, unknown>).response === 'string' &&
        Array.isArray((value as Record<string, unknown>).conv_history)
    );
}

export function isSubmitQuizResponse(value: unknown): value is SubmitQuizResponse {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as Record<string, unknown>).score === 'string' &&
        typeof (value as Record<string, unknown>).remarks === 'string'
    );
}
