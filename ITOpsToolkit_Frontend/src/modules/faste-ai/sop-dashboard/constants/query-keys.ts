export const SOP_QUERY_KEYS = {
    UNIFIED_DATASET: ['sops-unified-dataset'] as const,
    MESSAGES: (sessionId: string | null) => ['sopMessages', sessionId || 'live'] as const,
};
