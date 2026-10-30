import { twMerge, type ClassNameValue } from 'tailwind-merge';
import IncidentsSearchInput from './IncidentsSearchInput';
import IncidentAssignementFilterButton from './IncidentAssignementFilterButton';
import { FaUsers, FaUser, FaUserTimes } from 'react-icons/fa';
import type { SnowTicket, SnowTicketAssignmentFilterType } from '../../../../../shared/modules/servicenow/types/ticket';
import RefetchButton from '@/shared/components/ui/RefetchButton/RefetchButton';
import IncidentStatePriorityDropdownButton from './IncidentStatePriorityDropdownButton';

interface IncidentQueryBarProps {
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    onSearchSubmit?: () => void;
    onAssignmentFilterClick?: (id: SnowTicketAssignmentFilterType) => void;
    incidents: SnowTicket[];
    incidentStateFilter: string | null;
    incidentPriorityFilter: string | null;
    incidentAssignmentGroupFilter: string | null;
    onIncidentFiltersChange: (state: string | null, priority: string | null, assignmentGroup: string | null) => void;
    className?: ClassNameValue;
    selectedAssignmentFilter: SnowTicketAssignmentFilterType;
    isRefetching: boolean;
    onRefetch?: () => void;
}

const IncidentQueryBar = ({
    searchValue,
    onSearchChange,
    onSearchSubmit,
    selectedAssignmentFilter,
    onAssignmentFilterClick,
    incidents,
    incidentStateFilter,
    incidentPriorityFilter,
    incidentAssignmentGroupFilter,
    onIncidentFiltersChange,
    className,
    isRefetching,
    onRefetch,
}: IncidentQueryBarProps) => {
    const isSelectedAssignmentFlter = (required: SnowTicketAssignmentFilterType) => selectedAssignmentFilter === required;

    return (
        <div className={twMerge('relative flex items-center justify-between text-gray-600 gap-3', className)}>
            {/* main content - pointer-events blocked when disabled */}
            <div className={twMerge('flex items-center justify-between gap-1.5 w-full')}>
                <IncidentsSearchInput placeholder="Search Number or Short Description" value={searchValue} onChange={onSearchChange} onSubmit={onSearchSubmit} className="flex-1" />
                <div className={twMerge('flex items-center divide-x gap-2.5 mx-1.5 transition-opacity duration-150')}>
                    {/* Hidden SVG for Gradient */}
                    <svg width="0" height="0" style={{ position: 'absolute' }}>
                        <defs>
                            <linearGradient id="user-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="var(--brand-title-primary-color)" />
                                <stop offset="100%" stopColor="var(--brand-color)" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <IncidentAssignementFilterButton
                        icon={
                            <FaUser
                                size={14}
                                style={{
                                    fill: isSelectedAssignmentFlter('assigned-to-user') ? 'url(#user-gradient)' : 'none',
                                    stroke: 'currentColor',
                                    strokeWidth: isSelectedAssignmentFlter('assigned-to-user') ? '0' : '30',
                                    overflow: 'visible',
                                }}
                            />
                        }
                        label="Assigned to me"
                        id="assigned-to-user"
                        onClick={onAssignmentFilterClick}
                        isSelected={isSelectedAssignmentFlter('assigned-to-user')}
                    />
                    <IncidentAssignementFilterButton
                        icon={
                            <FaUsers
                                size={20}
                                style={{
                                    fill: isSelectedAssignmentFlter('assignemnt-group') ? 'url(#user-gradient)' : 'none',
                                    stroke: 'currentColor',
                                    strokeWidth: isSelectedAssignmentFlter('assignemnt-group') ? '0' : '30',
                                    overflow: 'visible',
                                }}
                            />
                        }
                        label="Assignment group"
                        id="assignemnt-group"
                        onClick={onAssignmentFilterClick}
                        isSelected={isSelectedAssignmentFlter('assignemnt-group')}
                    />
                    <IncidentAssignementFilterButton
                        icon={
                            <FaUserTimes
                                size={16}
                                style={{
                                    fill: isSelectedAssignmentFlter('unassigned') ? 'url(#user-gradient)' : 'none',
                                    stroke: 'currentColor',
                                    strokeWidth: isSelectedAssignmentFlter('unassigned') ? '0' : '30',
                                    overflow: 'visible',
                                }}
                            />
                        }
                        label="Unassigned"
                        id="unassigned"
                        onClick={onAssignmentFilterClick}
                        isSelected={isSelectedAssignmentFlter('unassigned')}
                    />
                </div>
                <IncidentStatePriorityDropdownButton
                    incidents={incidents}
                    selectedState={incidentStateFilter}
                    selectedPriority={incidentPriorityFilter}
                    selectedAssignmentGroup={incidentAssignmentGroupFilter}
                    onSelectFilters={onIncidentFiltersChange}
                />
                {onRefetch && <RefetchButton isRefetching={isRefetching} onRefetch={onRefetch} />}
            </div>
        </div>
    );
};

export default IncidentQueryBar;
