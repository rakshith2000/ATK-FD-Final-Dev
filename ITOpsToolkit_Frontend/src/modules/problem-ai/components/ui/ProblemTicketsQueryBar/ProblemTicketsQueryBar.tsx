import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { FaUsers, FaUser, FaUserTimes } from 'react-icons/fa';
import RefetchButton from '@/shared/components/ui/RefetchButton/RefetchButton';
import type { SnowTicket, SnowTicketAssignmentFilterType } from '@/shared/modules/servicenow/types/ticket';
import { SelectInput } from '@/shared/components/ui/InputFields';
import problemStatusFilterOptions, { type ProblemStatusFilter } from '@/modules/problem-ai/constants/problem-status-filter-options';
import ProblemTicketsAssignementFilterButton from './ProblemTicketsAssignementFilterButton';
import ProblemTicketStateDropdownButton from './ProblemTicketStateDropdownButton';
import TicketsSearchInput from '@/modules/service-request/components/ui/TicketsQueryBar/TicketsSearchInput';

interface ProblemTicketsQueryBarProps {
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    onSearchSubmit?: () => void;
    onAssignmentFilterClick?: (id: SnowTicketAssignmentFilterType) => void;
    problems: SnowTicket[];

    ticketStateFilter: string | null;
    ticketPriorityFilter: string | null;
    onProblemFiltersChange: (state: string | null, priority: string | null) => void;

    className?: ClassNameValue;
    selectedAssignmentFilter: SnowTicketAssignmentFilterType;
    isRefetching: boolean;
    onRefetch?: () => void;
    status: ProblemStatusFilter;
    onStatusChange: (status: ProblemStatusFilter) => void;
}

const ProblemTicketsQueryBar = ({
    searchValue,
    onSearchChange,
    onSearchSubmit,
    problems,
    selectedAssignmentFilter,
    onAssignmentFilterClick,
    // ticketStateOptions,
    ticketStateFilter,
    ticketPriorityFilter,
    onProblemFiltersChange,

    className,
    isRefetching,
    onRefetch,
    status,
    onStatusChange,
}: ProblemTicketsQueryBarProps) => {
    const isSelectedAssignmentFlter = (required: SnowTicketAssignmentFilterType) => selectedAssignmentFilter === required;

    return (
        <div className={twMerge('relative flex items-center justify-between text-gray-600 gap-3', className)}>
            {/* main content - pointer-events blocked when disabled */}
            <div className={twMerge('flex items-center justify-between gap-1.5 w-full')}>
                <TicketsSearchInput value={searchValue} onChange={onSearchChange} onSubmit={onSearchSubmit} className="flex-1" placeholder="Search Number or Short Description" />
                <div className={twMerge('flex items-center divide-x gap-2.5 mx-1.5 transition-opacity duration-150')}>
                    {' '}
                    {/* Hidden SVG for Gradeint */}
                    <svg width="0" height="0" style={{ position: 'absolute' }}>
                        <defs>
                            <linearGradient id="user-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="var(--brand-title-primary-color)" />
                                <stop offset="100%" stopColor="var(--brand-color)" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <ProblemTicketsAssignementFilterButton
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
                    <ProblemTicketsAssignementFilterButton
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
                    <ProblemTicketsAssignementFilterButton
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
                <ProblemTicketStateDropdownButton
                    problems={problems}
                    selectedState={ticketStateFilter}
                    selectedPriority={ticketPriorityFilter}
                    onSelectFilters={onProblemFiltersChange}
                />

                <div className="w-36 flex-1">
                    <SelectInput value={status} onChange={(next) => onStatusChange(next as ProblemStatusFilter)} options={problemStatusFilterOptions} clearable={false} />
                </div>

                {onRefetch && <RefetchButton isRefetching={isRefetching} onRefetch={onRefetch} />}
            </div>
        </div>
    );
};

export default ProblemTicketsQueryBar;
