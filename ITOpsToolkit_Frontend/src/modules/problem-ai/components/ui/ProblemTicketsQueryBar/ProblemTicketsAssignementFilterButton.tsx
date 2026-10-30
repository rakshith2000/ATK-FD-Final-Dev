import type React from 'react';
import type { ReactNode } from 'react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { Tooltip } from '@mui/material';
import type { SnowTicketAssignmentFilterType } from '@/shared/modules/servicenow/types/ticket';

interface ProblemTicketsAssignementFilterButtonProps {
    icon: ReactNode;
    label: string;
    onClick?: (id: SnowTicketAssignmentFilterType) => void;
    className?: ClassNameValue;
    id: SnowTicketAssignmentFilterType;
    isSelected: boolean;
}

const ProblemTicketsAssignementFilterButton: React.FC<ProblemTicketsAssignementFilterButtonProps> = ({ icon, label, className, onClick, id, isSelected }) => {
    const handleClick = () => onClick?.(id);

    const styleClass = isSelected ? 'text-(--brand-color) scale:' : 'text-gray-600';

    return (
        <Tooltip title={label} placement="bottom" arrow>
            <button
                type="button"
                aria-label={label}
                onClick={handleClick}
                className={twMerge(styleClass, 'rounded-sm hover:text-(--change-arrow-text) border-none transition-colors cursor-pointer', className)}
            >
                {icon}
            </button>
        </Tooltip>
    );
};

export default ProblemTicketsAssignementFilterButton;
