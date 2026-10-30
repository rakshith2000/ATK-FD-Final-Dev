import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import CheckboxInput from '@/shared/components/ui/InputFields/CheckboxInput';
import { EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import type { NewQuizKbArticle } from '../../../types/train-ai';

const MAX_SELECTION = 3;

interface ArticleCheckboxListProps {
    categoryName: string;
    articles: NewQuizKbArticle[];
    selectedIds: string[];
    onToggle: (sysId: string) => void;
}

const ArticleCheckboxList: React.FC<ArticleCheckboxListProps> = ({ categoryName, articles, selectedIds, onToggle }) => {
    return (
        <div className="h-full flex flex-col overflow-hidden min-w-[420px]">
            <div className="px-3 pt-2 pb-1 border-b border-gray-200 shrink-0">
                <TitleWithArraow title={categoryName.toUpperCase()} className="text-xs font-extrabold uppercase text-(--brand-header-title-color)" />
                <p className="text-xs font-semibold px-2 mt-1 text-(--brand-color)">Choose minimum 1 &amp; maximum {MAX_SELECTION} articles to begin the quiz</p>
            </div>

            <div className="flex-1 overflow-y-auto">
                {articles.length === 0 ? (
                    <EmptyPlaceholder message="No articles found" />
                ) : (
                    articles.map((article, idx) => {
                        const sysId = article.sys_id.value;
                        const isSelected = selectedIds.includes(sysId);
                        const isDisabled = !isSelected && selectedIds.length >= MAX_SELECTION;

                        return (
                            <div key={sysId}>
                                <div className={`px-4 py-2.5 transition-colors ${isDisabled ? 'opacity-40' : 'hover:bg-gray-50'} ${isSelected ? 'bg-gray-50' : ''}`}>
                                    <CheckboxInput
                                        checked={isSelected}
                                        disabled={isDisabled}
                                        onChange={() => onToggle(sysId)}
                                        label={article.short_description.display_value}
                                        className="w-3.5 h-3.5 shrink-0 accent-(--brand-color)"
                                        labelClassName="text-xs text-gray-700 leading-snug w-full gap-3"
                                    />
                                </div>
                                {idx < articles.length - 1 && <div className="border-b border-gray-100 mx-4" />}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ArticleCheckboxList;
