import type { DuplicateGroup } from '@/modules/knowledge-ai/types';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import { twMerge, type ClassNameValue } from 'tailwind-merge';

interface DuplcateKBArticlesGroupCardProps {
    layoutClassName?: ClassNameValue;
    group: DuplicateGroup;
    id: string;
    onClick?: (group: DuplicateGroup) => void;
}

const DuplcateKBArticlesGroupCard: React.FC<DuplcateKBArticlesGroupCardProps> = ({ layoutClassName, group, id, onClick }) => {
    const handleOnGroupClick = () => {
        onClick?.(group);
    };
    return (
        <div onClick={handleOnGroupClick} className="h-full w-full">
            <ShellLayout id={id} className={twMerge('rounded-lg w-full h-full border-none cursor-pointer', layoutClassName)}>
                <ShellLayout.Header className="brand-box-show-inset border-b border-(--brand-text-inverse) px-2 py-2 flex justify-between items-center">
                    <h1 className="text-(--brand-title-primary-color) text-xs 2xl:text-sm font-semibold">{group?.category}</h1>
                    <span className="brand-bg-with-gradient-1 text-gray-100 px-4 py-1 2xl:py-2 shadow rounded-lg text-[0.65rem] 2xl:text-xs font-bold">
                        {group?.articlesCount} Duplicates
                    </span>
                </ShellLayout.Header>
                <ShellLayout.Body className="flex flex-col p-2 brand-box-show-inset gap-4">
                    {group?.articles?.map((article) => (
                        <div key={article?.kb_metadata?.number}>
                            <p className="text-xs 2xl:text-sm text-(--brand-title-primary-color) font-medium">{article?.kb_metadata?.title}</p>
                            <p className="flex items-center justify-between mt-1 text-[0.65rem] 2xl:text-xs font-extrabold">
                                <span>{article?.kb_metadata?.author}</span>
                                <span>{article?.kb_metadata?.number}</span>
                            </p>
                        </div>
                    ))}
                </ShellLayout.Body>
            </ShellLayout>
        </div>
    );
};

export default DuplcateKBArticlesGroupCard;
