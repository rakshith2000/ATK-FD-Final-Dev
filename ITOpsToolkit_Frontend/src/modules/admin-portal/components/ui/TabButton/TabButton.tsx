import type { ReactNode } from 'react';
import type React from 'react';
import { twMerge } from 'tailwind-merge';

interface TabButtonProps {
    id: string;
    onSelect?: (id: string) => void;
    displayName: string;
    isSelected?: boolean;
    className?: string;
    icon: ReactNode | null;
}

const TabButton: React.FC<TabButtonProps> = ({ icon, id, onSelect, className, isSelected, displayName }) => {
    const handleOnClick = () => {
        onSelect?.(id);
    };
    return (
        <div
            id={id}
            onClick={handleOnClick}
            role="button"
            data-active={isSelected}
            className={twMerge(
                'text-xs flex fle-row p-2 justify-center items-center text-center gap-3 cursor-pointer transition-all [transition-property:padding,margin,transform,shadow,translate,scale,border] duration-500 bg-transparent',
                className,
                isSelected
                    ? 'rounded-full scale-105 brand-btn-with-gradient-2 font-semibold px-5 shadow-[0_0px_5px_1px_var(--brand-border-color)]'
                    : 'rounded-xl px-3 hover:scale-100 hover:shadow-[0_0px_3px_1px_var(--brand-border-color)] text-(--brand-title-primary-color)',
            )}
        >
            {/* Icon */}
            {icon}

            {/* Title */}
            <span>{displayName}</span>
        </div>
    );
};

export default TabButton;
