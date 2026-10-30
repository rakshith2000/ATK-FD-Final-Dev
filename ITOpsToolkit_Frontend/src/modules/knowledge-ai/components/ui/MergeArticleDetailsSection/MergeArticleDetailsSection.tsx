import { type ReactNode } from 'react';

interface MergeArticleDetailsSectionProps {
    children: ReactNode;
    className?: string;
}

function MergeArticleDetailsSection({ children, className = '' }: MergeArticleDetailsSectionProps) {
    return <div className={`flex flex-col gap-2 ${className}`}>{children}</div>;
}

interface MergeArticleDetailsSectionTitleProps {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
}

function MergeArticleDetailsSectionTitle({ children, onClick, className = '' }: MergeArticleDetailsSectionTitleProps) {
    return (
        <h2 onClick={onClick} className={`text-xs 2xl:text-sm text-(--brand-title-primary-color) font-semibold ${onClick ? 'cursor-pointer' : ''} ${className}`}>
            {children}
        </h2>
    );
}

interface MergeArticleDetailsSectionBodyProps {
    children: ReactNode;
    className?: string;
}

function MergeArticleDetailsSectionBody({ children, className = '' }: MergeArticleDetailsSectionBodyProps) {
    return <ul className={`list-disc list-outside pl-6 space-y-1 bg-white border border-(--brand-border-color) shadow rounded p-2 ${className}`}>{children}</ul>;
}

interface MergeArticleDetailsSectionBodyItemProps {
    children: ReactNode;
    className?: string;
}

function MergeArticleDetailsSectionBodyItem({ children, className = '' }: MergeArticleDetailsSectionBodyItemProps) {
    return <li className={`text-xs 2xl:text-sm mt-1 text-(--brand-text-color) ${className}`}>{children}</li>;
}

MergeArticleDetailsSection.Title = MergeArticleDetailsSectionTitle;
MergeArticleDetailsSection.Body = MergeArticleDetailsSectionBody;
MergeArticleDetailsSection.BodyItem = MergeArticleDetailsSectionBodyItem;

export { MergeArticleDetailsSection };
