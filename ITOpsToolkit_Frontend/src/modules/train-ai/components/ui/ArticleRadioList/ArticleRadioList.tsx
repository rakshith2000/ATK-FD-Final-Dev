import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import { EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import type { NewQuizKbArticle } from '../../../types/train-ai';

interface ArticleRadioListProps {
    categoryName: string;
    articles: NewQuizKbArticle[];
    selectedId: string;
    onSelect: (sysId: string) => void;
}

const ArticleRadioList: React.FC<ArticleRadioListProps> = ({ categoryName, articles, selectedId, onSelect }) => {
    return (
        <div className="h-full flex flex-col overflow-hidden min-w-[420px]">
            <div className="px-3 pt-2 pb-1 border-b border-gray-200 shrink-0">
                <TitleWithArraow title={categoryName.toUpperCase()} className="text-xs font-extrabold uppercase text-(--brand-header-title-color)" />
                <p className="text-xs font-semibold px-2 mt-1 text-(--brand-color)">Choose 1 article to begin the scenario</p>
            </div>

            <div className="flex-1 overflow-y-auto">
                {articles.length === 0 ? (
                    <EmptyPlaceholder message="No articles found" />
                ) : (
                    articles.map((article, idx) => {
                        const sysId = article.sys_id.value;
                        const isSelected = selectedId === sysId;

                        return (
                            <div key={sysId}>
                                <label className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-gray-50' : ''}`}>
                                    <input
                                        type="radio"
                                        name="mock-quiz-article"
                                        checked={isSelected}
                                        onChange={() => onSelect(sysId)}
                                        className="w-3.5 h-3.5 shrink-0 accent-(--brand-color)"
                                    />
                                    <span className="text-xs text-gray-700 leading-snug">{article.short_description.display_value}</span>
                                </label>
                                {idx < articles.length - 1 && <div className="border-b border-gray-100 mx-4" />}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ArticleRadioList;
