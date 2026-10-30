import { useQuery } from '@tanstack/react-query';
import type { KBArticleScoringRequest, KBArticleScoringResponse } from '../types/knowledge-base';
import { getKbArticleAIScroing } from '../services/get-kb-article-ai-scoring';

export function useKnowledgeArticleAIScoreQuery(payload: KBArticleScoringRequest, enabled: boolean = true, initialData?: KBArticleScoringResponse) {
    const queryKey = ['knowledge-article-ai-score', payload.KBContent, payload.KBNumber, payload.getScoreBy];
    const query = useQuery<KBArticleScoringResponse, Error>({
        queryKey,
        queryFn: getKbArticleAIScroing.bind(null, { payload }),
        enabled,
        initialData,
        staleTime: 0,
    });

    return { ...query, queryKey };
}
