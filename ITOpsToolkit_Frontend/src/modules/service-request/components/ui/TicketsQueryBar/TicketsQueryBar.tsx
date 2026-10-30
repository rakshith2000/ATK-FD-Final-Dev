import { twMerge, type ClassNameValue } from 'tailwind-merge';
import TicketTypeDropdownButton from './TicketTypeDropdownButton';
import TicketsSearchInput from './TicketsSearchInput';
import TicketAssignementFilterButton from './TicketsAssignementFilterButton';
import { FaUsers, FaUser, FaUserTimes } from 'react-icons/fa';
import type { SnowTicket, SnowTicketAssignmentFilterType, SnowTableName } from '../../../../../shared/modules/servicenow/types/ticket';
import RefetchButton from '@/shared/components/ui/RefetchButton/RefetchButton';
import TicketStatePriorityDropdownButton from './TicketStatePriorityDropdownButton';

interface TicketsQueryBarProps {
    ticketType: SnowTableName;
    searchValue?: string;
    onTicketTypeOptionClick?: (option: { label: string; value: SnowTableName }) => void;
    ticketTypeOptions: Array<{
        label: string;
        value: SnowTableName;
    }>;
    onSearchChange?: (value: string) => void;
    onSearchSubmit?: () => void;
    onAssignmentFilterClick?: (id: SnowTicketAssignmentFilterType) => void;
    tickets: SnowTicket[];
    stateChoices: Array<{ value: string; label: string }>;
    ticketStateFilter: string | null;
    ticketPriorityFilter: string | null;
    onTicketFiltersChange: (state: string | null, priority: string | null) => void;
    isStateOptionsLoading?: boolean;
    className?: ClassNameValue;
    selectedAssignmentFilter: SnowTicketAssignmentFilterType;
    isRefetching: boolean;
    onRefetch?: () => void;
}

const TicketsQueryBar = ({
    ticketType,
    searchValue,
    onTicketTypeOptionClick,
    ticketTypeOptions,
    onSearchChange,
    onSearchSubmit,
    selectedAssignmentFilter,
    onAssignmentFilterClick,
    tickets,
    stateChoices,
    ticketStateFilter,
    ticketPriorityFilter,
    onTicketFiltersChange,
    isStateOptionsLoading,
    className,
    isRefetching,
    onRefetch,
}: TicketsQueryBarProps) => {
    const isSelectedAssignmentFlter = (required: SnowTicketAssignmentFilterType) => selectedAssignmentFilter === required;

    return (
        <div className={twMerge('relative flex items-center justify-between text-gray-600 gap-3', className)}>
            {/* main content - pointer-events blocked when disabled */}
            <div className={twMerge('flex items-center justify-between gap-1.5 w-full')}>
                <TicketsSearchInput value={searchValue} onChange={onSearchChange} onSubmit={onSearchSubmit} className="flex-1" />
                <div className="flex items-center divide-x gap-2.5 mx-1.5">
                    {/* Hidden SVG for Gradeint */}
                    <svg width="0" height="0" style={{ position: 'absolute' }}>
                        <defs>
                            <linearGradient id="user-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="var(--brand-title-primary-color)" />
                                <stop offset="100%" stopColor="var(--brand-color)" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <TicketAssignementFilterButton
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
                    <TicketAssignementFilterButton
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
                    <TicketAssignementFilterButton
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
                <TicketStatePriorityDropdownButton
                    tickets={tickets}
                    stateChoices={stateChoices}
                    selectedState={ticketStateFilter}
                    selectedPriority={ticketPriorityFilter}
                    onSelectFilters={onTicketFiltersChange}
                    isLoading={isStateOptionsLoading}
                />
                <TicketTypeDropdownButton
                    options={ticketTypeOptions}
                    selected={ticketTypeOptions.filter((opt) => opt.value === ticketType).at(0)}
                    onSelect={onTicketTypeOptionClick}
                />
                {onRefetch && <RefetchButton isRefetching={isRefetching} onRefetch={onRefetch} />}
            </div>
        </div>
    );
};

export default TicketsQueryBar;
