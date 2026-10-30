import { ArrowLeft } from 'lucide-react';
import type React from 'react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';

interface GoBackButtonProps {
    className?: ClassNameValue;
    onClick: () => void;
    iconSize?: number;
    title: string;
}

const GoBackButton: React.FC<GoBackButtonProps> = ({ className, onClick, iconSize = 14, title }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={twMerge(
                'self-start inline-flex items-center gap-1.5 text-xs text-(--brand-text-gray) hover:text-(--brand-issue-title-color) font-semibold cursor-pointer transition-colors',
                className,
            )}
        >
            <ArrowLeft size={iconSize} />
            {title}
        </button>
    );
};

export default GoBackButton;
