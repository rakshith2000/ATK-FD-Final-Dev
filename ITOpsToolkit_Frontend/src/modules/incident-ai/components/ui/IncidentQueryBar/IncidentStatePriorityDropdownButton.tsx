import { ChevronDown } from 'lucide-react';
import { useMemo } from 'react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { Tooltip } from '@mui/material';
import type { SnowTicket } from '../../../../../shared/modules/servicenow/types/ticket';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/shadcn/components/ui/dropdown-menu';

interface IncidentStateDropdownButtonProps {
    incidents: SnowTicket[];
    selectedState: string | null;
    selectedPriority: string | null;
    selectedAssignmentGroup: string | null;
    onSelectFilters: (state: string | null, priority: string | null, assignmentGroup: string | null) => void;
    isLoading?: boolean;
    className?: ClassNameValue;
}

const IncidentStateDropdownButton: React.FC<IncidentStateDropdownButtonProps> = ({
    incidents,
    selectedState,
    selectedPriority,
    selectedAssignmentGroup,
    onSelectFilters,
    isLoading,
    className,
}) => {
    const {
        totalCount,
        stateCounts,
        priorityCounts,
        nestedCounts,
        nestedCountsByState,
        stateOptions,
        priorityOptions,
        assignmentGroupOptions,
        assignmentGroupCounts,
        stateLabels,
        priorityLabels,
    } = useMemo(() => {
        const incidentsList = incidents ?? [];
        const listTotalCount = incidentsList.length;

        const sCounts: Record<string, number> = {};
        const sLabels: Record<string, string> = {};
        const pCounts: Record<string, number> = {};
        const pLabels: Record<string, string> = {
            '1': 'P1',
            '2': 'P2',
            '3': 'P3',
            '4': 'P4',
            '5': 'P5',
        };
        const nCounts: Record<string, Record<string, number>> = {};
        const nCountsByState: Record<string, Record<string, number>> = {};
        const agCounts: Record<string, number> = {};
        const agLabels: Record<string, string> = {};

        const uniqueStateValues = new Set<string>();

        for (const incident of incidentsList) {
            const sVal = incident.state?.value ?? '';
            const sLabel = incident.state?.display_value;
            const pVal = incident.priority?.value ?? '';
            const pLabel = incident.priority?.display_value;
            const agVal = incident.assignment_group?.value ?? '';
            const agLabel = incident.assignment_group?.display_value;

            if (sVal) {
                sCounts[sVal] = (sCounts[sVal] ?? 0) + 1;
                if (sLabel) sLabels[sVal] = sLabel;
                uniqueStateValues.add(sVal);
            }

            if (pVal) {
                pCounts[pVal] = (pCounts[pVal] ?? 0) + 1;
                if (pLabel) pLabels[pVal] = pLabel;
            }

            if (agVal) {
                agCounts[agVal] = (agCounts[agVal] ?? 0) + 1;
                if (agLabel) agLabels[agVal] = agLabel;
            }

            if (pVal && sVal) {
                if (!nCounts[pVal]) nCounts[pVal] = {};
                nCounts[pVal][sVal] = (nCounts[pVal][sVal] ?? 0) + 1;

                if (!nCountsByState[sVal]) nCountsByState[sVal] = {};
                nCountsByState[sVal][pVal] = (nCountsByState[sVal][pVal] ?? 0) + 1;
            }
        }

        const orderedStateValues = Array.from(uniqueStateValues).sort((a, b) => {
            const labelA = sLabels[a] ?? a;
            const labelB = sLabels[b] ?? b;
            return labelA.localeCompare(labelB);
        });

        const builtStateOptions = orderedStateValues.map((value) => ({
            value,
            label: sLabels[value] ?? value,
            count: sCounts[value] ?? 0,
        }));

        const builtPriorityOptions = Object.entries(pLabels)
            .map(([value, label]) => ({
                value,
                label,
                count: pCounts[value] ?? 0,
            }))
            .filter((opt) => opt.count > 0);

        const builtAssignmentGroupOptions = Object.entries(agLabels)
            .map(([value, label]) => ({
                value,
                label,
                count: agCounts[value] ?? 0,
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

        return {
            totalCount: listTotalCount,
            stateCounts: sCounts,
            priorityCounts: pCounts,
            nestedCounts: nCounts,
            nestedCountsByState: nCountsByState,
            stateOptions: builtStateOptions,
            priorityOptions: builtPriorityOptions,
            assignmentGroupOptions: builtAssignmentGroupOptions,
            assignmentGroupCounts: agCounts,
            stateLabels: sLabels,
            priorityLabels: pLabels,
        };
    }, [incidents]);

    const getActiveFilterLabel = () => {
        const parts: string[] = [];
        if (selectedPriority) {
            const priorityLabel = priorityLabels[selectedPriority] ?? selectedPriority;
            parts.push(priorityLabel);
        }
        if (selectedState) {
            parts.push(stateLabels[selectedState] ?? selectedState);
        }
        if (selectedAssignmentGroup) {
            const agOption = assignmentGroupOptions.find((o) => o.value === selectedAssignmentGroup);
            parts.push(agOption?.label ?? selectedAssignmentGroup);
        }
        return parts.length > 0 ? parts.join(' / ') : 'All';
    };

    const getActiveFilterCount = () => {
        if (selectedAssignmentGroup) {
            return assignmentGroupCounts[selectedAssignmentGroup] ?? 0;
        }
        if (selectedState && selectedPriority) {
            return nestedCounts[selectedPriority]?.[selectedState] ?? 0;
        }
        if (selectedState) {
            return stateCounts[selectedState] ?? 0;
        }
        if (selectedPriority) {
            return priorityCounts[selectedPriority] ?? 0;
        }
        return totalCount;
    };

    return (
        <DropdownMenu>
            <Tooltip arrow placement="bottom" title="Filter by State / Priority / Assignment Group">
                <DropdownMenuTrigger
                    disabled={isLoading || totalCount === 0}
                    className={twMerge(
                        'flex items-center gap-1 text-xs font-bold cursor-pointer select-none px-2.5 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors',
                        isLoading && 'opacity-50 cursor-not-allowed',
                        'disabled:cursor-not-allowed',
                        className,
                    )}
                >
                    <span>{getActiveFilterLabel()}</span>
                    <span className="text-[0.65rem] font-semibold gradient-text">({getActiveFilterCount()})</span>
                    <ChevronDown size={14} className="transition-transform duration-200" />
                </DropdownMenuTrigger>
            </Tooltip>

            <DropdownMenuContent align="end" className="min-w-55 max-h-[80vh] overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-100 py-1 text-xs text-gray-700">
                {/* Clear Filters */}
                <DropdownMenuItem
                    className={twMerge(
                        'cursor-pointer px-3 py-2 hover:bg-gray-50 flex items-center justify-between font-medium border-b border-gray-100 rounded-none',
                        !selectedState && !selectedPriority && !selectedAssignmentGroup && 'bg-blue-50/50 text-blue-600 font-semibold',
                    )}
                    onClick={() => onSelectFilters(null, null, null)}
                >
                    <span>All Incidents</span>
                    <span className="text-[0.65rem] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{totalCount}</span>
                </DropdownMenuItem>

                {/* States */}
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="px-3 py-1 text-[0.6rem] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">States</DropdownMenuLabel>
                    {stateOptions.map((opt) => {
                        const nestedPriorities = priorityOptions.filter((p) => (nestedCountsByState[opt.value]?.[p.value] ?? 0) > 0);

                        return (
                            <DropdownMenuSub key={opt.value}>
                                <DropdownMenuSubTrigger
                                    className={twMerge(
                                        'cursor-pointer px-3 py-1.5 hover:bg-gray-50 flex items-center justify-between text-xs rounded-none',
                                        selectedState === opt.value && !selectedPriority && 'bg-blue-50/50 text-blue-600 font-semibold',
                                    )}
                                    onClick={() => onSelectFilters(opt.value, null, null)}
                                >
                                    <span>{opt.label}</span>
                                    <span className="text-[0.65rem] font-semibold text-gray-500 mr-1">{opt.count}</span>
                                </DropdownMenuSubTrigger>
                                {nestedPriorities.length > 0 && (
                                    <DropdownMenuSubContent className="bg-white border border-gray-200 shadow-xl rounded-lg py-1 text-xs min-w-52">
                                        <DropdownMenuLabel className="px-3 py-1 text-[0.6rem] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                                            Priority (in {opt.label})
                                        </DropdownMenuLabel>
                                        {nestedPriorities.map((p) => {
                                            const nestedCount = nestedCountsByState[opt.value]?.[p.value] ?? 0;
                                            return (
                                                <DropdownMenuItem
                                                    key={p.value}
                                                    className={twMerge(
                                                        'cursor-pointer px-3 py-1.5 hover:bg-blue-50 flex items-center justify-between text-xs rounded-none transition-colors',
                                                        selectedState === opt.value && selectedPriority === p.value && 'bg-blue-50 text-blue-600 font-semibold',
                                                    )}
                                                    onClick={() => onSelectFilters(opt.value, p.value, null)}
                                                >
                                                    <span>{p.label}</span>
                                                    <span className="text-[0.65rem] font-semibold text-gray-500">{nestedCount}</span>
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuSubContent>
                                )}
                            </DropdownMenuSub>
                        );
                    })}
                </DropdownMenuGroup>

                {/* Priorities */}
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="px-3 py-1 text-[0.6rem] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 border-t border-gray-100">
                        Priorities
                    </DropdownMenuLabel>
                    {priorityOptions.map((opt) => {
                        const nestedStates = stateOptions.filter((s) => (nestedCounts[opt.value]?.[s.value] ?? 0) > 0);

                        return (
                            <DropdownMenuSub key={opt.value}>
                                <DropdownMenuSubTrigger
                                    className={twMerge(
                                        'cursor-pointer px-3 py-1.5 hover:bg-gray-50 flex items-center justify-between text-xs rounded-none',
                                        selectedPriority === opt.value && !selectedState && 'bg-blue-50/50 text-blue-600 font-semibold',
                                    )}
                                    onClick={() => onSelectFilters(null, opt.value, null)}
                                >
                                    <span>{opt.label}</span>
                                    <span className="text-[0.65rem] font-semibold text-gray-500 mr-1">{opt.count}</span>
                                </DropdownMenuSubTrigger>
                                {nestedStates.length > 0 && (
                                    <DropdownMenuSubContent className="bg-white border border-gray-200 shadow-xl rounded-lg py-1 text-xs min-w-52">
                                        <DropdownMenuLabel className="px-3 py-1 text-[0.6rem] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                                            State (in {opt.label})
                                        </DropdownMenuLabel>
                                        {nestedStates.map((s) => {
                                            const nestedCount = nestedCounts[opt.value]?.[s.value] ?? 0;
                                            return (
                                                <DropdownMenuItem
                                                    key={s.value}
                                                    className={twMerge(
                                                        'cursor-pointer px-3 py-1.5 hover:bg-blue-50 flex items-center justify-between text-xs rounded-none transition-colors',
                                                        selectedState === s.value && selectedPriority === opt.value && 'bg-blue-50 text-blue-600 font-semibold',
                                                    )}
                                                    onClick={() => onSelectFilters(s.value, opt.value, null)}
                                                >
                                                    <span>{s.label}</span>
                                                    <span className="text-[0.65rem] font-semibold text-gray-500">{nestedCount}</span>
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuSubContent>
                                )}
                            </DropdownMenuSub>
                        );
                    })}
                </DropdownMenuGroup>

                {/* Assignment Groups */}
                {assignmentGroupOptions.length > 0 && (
                    <DropdownMenuGroup>
                        <DropdownMenuLabel className="px-3 py-1 text-[0.6rem] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 border-t border-gray-100">
                            Assignment Groups
                        </DropdownMenuLabel>
                        {assignmentGroupOptions.map((opt) => (
                            <DropdownMenuItem
                                key={opt.value}
                                className={twMerge(
                                    'cursor-pointer px-3 py-1.5 hover:bg-gray-50 flex items-center justify-between text-xs rounded-none',
                                    selectedAssignmentGroup === opt.value && 'bg-blue-50/50 text-blue-600 font-semibold',
                                )}
                                onClick={() => onSelectFilters(null, null, opt.value)}
                            >
                                <span className="truncate max-w-40">{opt.label}</span>
                                <span className="text-[0.65rem] font-semibold text-gray-500">{opt.count}</span>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuGroup>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default IncidentStateDropdownButton;
