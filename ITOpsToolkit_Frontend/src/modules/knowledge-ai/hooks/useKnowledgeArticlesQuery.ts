import { useQuery } from '@tanstack/react-query';
import fetchKnowledgeArticles from '../services/fetch-knowledge-articles';
import type { KBCatalogAnalytics, KnowledgeArticle_From_List_API } from '../types';
import getKBArticleAnalytics from '../utils/kb-article-analysis';

export function useKnowledgeArticlesQuery() {
    const queryKey = ['knowledgeArticles'];

    const query = useQuery<Array<KnowledgeArticle_From_List_API>, Error, KBCatalogAnalytics>({
        queryKey: queryKey,
        queryFn: fetchKnowledgeArticles,
        retry: false,
        enabled: true,
        staleTime: 5 * 60 * 1000,
        select: (articles) => getKBArticleAnalytics(articles),
    });

    return { ...query, queryKey };
}
