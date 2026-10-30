import { useEffect, useMemo, useState } from 'react';
import { useKbArticlesForQuizQuery } from '../../../hooks/useKbArticlesForQuizQuery';
import { useGenerateQuizMutation } from '../../../hooks/useGenerateQuizMutation';
import CategoryList from '../../ui/CategoryList/CategoryList';
import ArticleCheckboxList from '../../ui/ArticleCheckboxList/ArticleCheckboxList';
import GenerateQuizSuccessModal from '../../ui/GenerateQuizSuccessModal/GenerateQuizSuccessModal';
import { LoadingPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import type { GenerateQuizResponse, NewQuizKbArticle, QuizDifficultyLevel } from '../../../types/train-ai';

interface NewQuizSelectorProps {
    searchTerm: string;
    onStartQuiz: (quizId: string, category: string) => void;
}

const NewQuizSelector: React.FC<NewQuizSelectorProps> = ({ searchTerm, onStartQuiz }) => {
    const { data, isLoading, isError, error, isRefetching, refetch } = useKbArticlesForQuizQuery();
    const generateQuizMutation = useGenerateQuizMutation();

    const grouped = useMemo(() => {
        if (!data) return {} as Record<string, NewQuizKbArticle[]>;

        const seen = new Set<string>();
        const uniqueArticles = data.filter((article) => {
            const key = article.sys_id?.value || article.number?.display_value || article.short_description?.display_value || article.kb_category?.display_value || '';
            if (!key || seen.has(key)) return false;
            seen.add(key);
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
    const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [difficultyLevel, setDifficultyLevel] = useState<QuizDifficultyLevel>('Beginner');
    const [generatedQuiz, setGeneratedQuiz] = useState<GenerateQuizResponse | null>(null);

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
        setSelectedArticles((prev) => prev.filter((id) => articles.some((article) => article.sys_id.value === id)));
    }, [articles]);

    const handleToggle = (sysId: string) => {
        setSelectedArticles((prev) => (prev.includes(sysId) ? prev.filter((id) => id !== sysId) : [...prev, sysId]));
    };

    const handleOpenModal = () => {
        setGeneratedQuiz(null);
        setDifficultyLevel('Beginner');
        setIsModalOpen(true);
    };

    const handleConfirmGenerate = () => {
        const kbNumbers = selectedArticles.map((sysId) => data?.find((a) => a.sys_id.value === sysId)?.number.display_value).filter(Boolean) as string[];

        generateQuizMutation.mutate(
            { articlesNumber: kbNumbers, difficultyLevel },
            {
                onSuccess: (result) => {
                    if (result) setGeneratedQuiz(result);
                },
            },
        );
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setGeneratedQuiz(null);
        setSelectedArticles([]);
    };

    const handleModalStartQuiz = () => {
        if (generatedQuiz) {
            onStartQuiz(generatedQuiz.quiz_id, activeCategory);
        }
        setIsModalOpen(false);
        setGeneratedQuiz(null);
        setSelectedArticles([]);
    };

    if (isLoading) {
        return <LoadingPlaceholder message="Loading articles..." />;
    }

    if (isError) {
        return <ErrorPlaceholder error={error} onRetry={() => refetch()} isRefetching={isRefetching} />;
    }

    return (
        <>
            <div className="relative flex flex-col h-full overflow-hidden">
                {/* Two-column content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left — Categories */}
                    <aside className="w-52 shrink-0 overflow-hidden">
                        <CategoryList categories={categories} activeCategory={activeCategory} onSelect={setSelectedCategory} />
                    </aside>

                    {/* Right — Articles */}
                    <main className="flex-1 overflow-auto">
                        <ArticleCheckboxList categoryName={activeCategory} articles={articles} selectedIds={selectedArticles} onToggle={handleToggle} />
                    </main>
                </div>

                {/* Bottom action bar */}
                <div className="shrink-0 flex items-center justify-end gap-2 px-3 py-1.5 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={() => setSelectedArticles([])}
                        disabled={selectedArticles.length === 0 || generateQuizMutation.isPending}
                        className="px-3 py-1 text-xs font-medium border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                        Clear Selection
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenModal}
                        disabled={selectedArticles.length === 0 || generateQuizMutation.isPending}
                        className="px-3 py-1 text-xs font-semibold rounded bg-(--brand-color) text-(--brand-text-inverse) hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-opacity"
                    >
                        Generate Quiz
                    </button>
                </div>
            </div>

            <GenerateQuizSuccessModal
                isOpen={isModalOpen}
                quizId={generatedQuiz?.quiz_id ?? ''}
                passingThreshold={generatedQuiz?.passing_threshold ?? 70}
                difficultyLevel={difficultyLevel}
                isGenerating={generateQuizMutation.isPending}
                onDifficultyChange={setDifficultyLevel}
                onGenerate={handleConfirmGenerate}
                onClose={handleModalClose}
                onStartQuiz={handleModalStartQuiz}
            />
        </>
    );
};

export default NewQuizSelector;
