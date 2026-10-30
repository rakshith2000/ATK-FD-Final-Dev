import type React from 'react';
import type { ReactNode } from 'react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import type { SnowTicketAssignmentFilterType } from '../../../../../shared/modules/servicenow/types/ticket';
import { Tooltip } from '@mui/material';

interface IncidentAssignementFilterButtonProps {
    icon: ReactNode;
    label: string;
    onClick?: (id: SnowTicketAssignmentFilterType) => void;
    className?: ClassNameValue;
    id: SnowTicketAssignmentFilterType;
    isSelected: boolean;
}

const IncidentAssignementFilterButton: React.FC<IncidentAssignementFilterButtonProps> = ({ icon, label, className, onClick, id, isSelected }) => {
    const handleClick = () => onClick?.(id);

    const styleClass = isSelected ? 'text-(--brand-color) scale:' : 'text-gray-600';

    return (
        <Tooltip title={label} placement="bottom" arrow>
            <button
                type="button"
                aria-label={label}
                onClick={handleClick}
                className={twMerge(styleClass, 'rounded-sm hover:text-(--brand-color) border-none transition-colors cursor-pointer', className)}
            >
                <span>{icon}</span>
            </button>
        </Tooltip>
    );
};

export default IncidentAssignementFilterButton;
