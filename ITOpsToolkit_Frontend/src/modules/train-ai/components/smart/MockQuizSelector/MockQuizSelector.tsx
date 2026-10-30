import { useEffect, useMemo, useState } from 'react';
import { useKbArticlesForQuizQuery } from '../../../hooks/useKbArticlesForQuizQuery';
import CategoryList from '../../ui/CategoryList/CategoryList';
import ArticleRadioList from '../../ui/ArticleRadioList/ArticleRadioList';
import { LoadingPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import type { NewQuizKbArticle } from '../../../types/train-ai';

interface MockQuizSelectorProps {
    searchTerm: string;
    onStartScenario: (articleNumber: string) => void;
    isPending?: boolean;
}

const MockQuizSelector: React.FC<MockQuizSelectorProps> = ({ searchTerm, onStartScenario, isPending }) => {
    const { data, isLoading, isError, error, isRefetching, refetch } = useKbArticlesForQuizQuery();

    const grouped = useMemo(() => {
        if (!data) return {} as Record<string, NewQuizKbArticle[]>;

        const processedArticleKeys = new Set<string>();
        const uniqueArticles = data.filter((article) => {
            const articleIdentityKey =
                article.sys_id?.value || article.number?.display_value || article.short_description?.display_value || article.kb_category?.display_value || '';
            if (!articleIdentityKey || processedArticleKeys.has(articleIdentityKey)) return false;
            processedArticleKeys.add(articleIdentityKey);
            return true;
        });

        return uniqueArticles.reduce<Record<string, NewQuizKbArticle[]>>((acc, article) => {
            const category = article.kb_category?.display_value?.trim();
            if (!category) return acc;
            if (!acc[category]) acc[category] = [];
            acc[category].push(article);
            return acc;
        }, {});
    }, [data]);

    const categories = useMemo(() => Object.keys(grouped).filter((cat) => grouped[cat].length > 0), [grouped]);

    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedArticleId, setSelectedArticleId] = useState('');

    const activeCategory = selectedCategory || categories[0] || '';

    const articles = useMemo(() => {
        const categoryArticles = grouped[activeCategory] ?? [];
        if (!searchTerm.trim()) return categoryArticles;

        const term = searchTerm.toLowerCase();
        return categoryArticles.filter((article) => {
            const articleNumber = article.number?.display_value?.toLowerCase() ?? '';
            const shortDescription = article.short_description?.display_value?.toLowerCase() ?? '';
            return articleNumber.includes(term) || shortDescription.includes(term);
        });
    }, [grouped, activeCategory, searchTerm]);

    useEffect(() => {
        setSelectedArticleId((prev) => (prev && articles.some((article) => article.sys_id.value === prev) ? prev : ''));
    }, [articles]);

    const handleStartScenario = () => {
        const article = data?.find((a) => a.sys_id.value === selectedArticleId);
        const kbNumber = article?.number.display_value;
        if (kbNumber) onStartScenario(kbNumber);
    };

    if (isLoading) {
        return <LoadingPlaceholder message="Loading articles..." />;
    }

    if (isError) {
        return <ErrorPlaceholder error={error} onRetry={() => refetch()} isRefetching={isRefetching} />;
    }

    return (
        <div className="relative flex flex-col h-full overflow-hidden">
            {isPending && <LoadingPlaceholder overlay message="Generating scenario..." />}
            <div className="flex flex-1 overflow-hidden">
                <aside className="w-56 shrink-0 overflow-hidden">
                    <CategoryList categories={categories} activeCategory={activeCategory} onSelect={setSelectedCategory} />
                </aside>

                <main className="flex-1 overflow-auto">
                    <ArticleRadioList categoryName={activeCategory} articles={articles} selectedId={selectedArticleId} onSelect={setSelectedArticleId} />
                </main>
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2 px-3 py-1.5 border-t border-gray-200">
                <button
                    type="button"
                    onClick={() => setSelectedArticleId('')}
                    disabled={!selectedArticleId}
                    className="px-3 py-1 text-xs font-medium border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                    Clear Selection
                </button>
                <button
                    type="button"
                    onClick={handleStartScenario}
                    disabled={!selectedArticleId}
                    className="px-3 py-1 text-xs font-semibold rounded bg-(--brand-color) text-(--brand-text-inverse) hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-opacity"
                >
                    Start Scenario
                </button>
            </div>
        </div>
    );
};

export default MockQuizSelector;
