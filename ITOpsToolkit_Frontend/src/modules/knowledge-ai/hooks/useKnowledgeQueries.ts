import { useKnowledgeArticlesQuery } from './useKnowledgeArticlesQuery';
import { useDuplicateKnowledgeArticlesQuery } from './useDuplicateKnowledgeArticlesQuery';
import { useRecentKbArticlesQuery } from './useRecentKbArticlesQuery';

/**
 * @deprecated Import individual hooks instead:
 * - useKnowledgeArticlesQuery
 * - useDuplicateKnowledgeArticlesQuery
 * - useRecentKbsQuery
 */
export function useKnowledgeQueries() {
    const knowledgeArticlesQuery = useKnowledgeArticlesQuery();
    const duplicateKnowledgeArticlesQuery = useDuplicateKnowledgeArticlesQuery();
    const recentKbsQuery = useRecentKbArticlesQuery();

    return { knowledgeArticlesQuery, duplicateKnowledgeArticlesQuery, recentKbsQuery };
}
