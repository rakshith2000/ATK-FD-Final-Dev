import React from 'react';
import { MultiSelectInput } from '@/shared/components/ui/InputFields';
import TICKET_PRIORITY_OPTIONS from '@/shared/modules/servicenow/constants/ticket-priority-options';
import { RotateCw } from 'lucide-react';
import { useTicketFieldChoiceQuery } from '@/shared/modules/servicenow/hooks/useTicketFieldChoiceQuery';
import { getApiErrorMessage } from '@/api/utils/api-axios-error-response-message';
import { useUserMemberOfSnowAssignementGrpupsQuery } from '@/shared/modules/servicenow/hooks/useUserMemberOfSnowAssignementGroupsQuery';

interface IncidentAdvancedFiltersProps {
    stagedStates: string[];
    onStagedStatesChange: (states: string[]) => void;
    stagedPriorities: string[];
    onStagedPrioritiesChange: (priorities: string[]) => void;
    stagedAssignmentGroups: string[];
    onStagedAssignmentGroupsChange: (groups: string[]) => void;
    onApply: () => void;
    onCancel?: () => void;
    onReset?: () => void;
    isRefetching?: boolean;
    onRefetch?: () => void;
    disableSubmit?: boolean;
}

const IncidentAdvancedFilters: React.FC<IncidentAdvancedFiltersProps> = ({
    stagedStates,
    onStagedStatesChange,
    stagedPriorities,
    onStagedPrioritiesChange,
    onStagedAssignmentGroupsChange,
    stagedAssignmentGroups,
    onApply,
    onCancel,
    onReset,
    isRefetching = false,
    onRefetch,
    disableSubmit = false,
}) => {
    const incStateChoiceQuery = useTicketFieldChoiceQuery('incident', 'state');

    const userAssignmentGroupsQuery = useUserMemberOfSnowAssignementGrpupsQuery();

    return (
        <div className="flex flex-col gap-3.5 p-4 bg-white rounded-2xl border border-slate-200/90 w-80 text-xs shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="font-extrabold text-slate-900 text-xs tracking-tight uppercase">Filters</span>
                {onRefetch && (
                    <button
                        onClick={onRefetch}
                        disabled={isRefetching}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="Refresh data"
                    >
                        <RotateCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                    </button>
                )}
                <div className="flex items-center gap-1.5 ml-auto">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="px-2.5 py-1 font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer focus:outline-none"
                        >
                            Close
                        </button>
                    )}

                    <button
                        onClick={onReset}
                        className="px-2.5 py-1 font-semibold bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-lg transition-all cursor-pointer focus:outline-none"
                    >
                        Reset
                    </button>

                    <button
                        onClick={onApply}
                        disabled={disableSubmit}
                        className="px-3 py-1 font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 border border-transparent rounded-lg transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                        Apply
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <span className="font-bold text-slate-500 tracking-wider text-[0.625rem] uppercase">State</span>
                <MultiSelectInput
                    value={stagedStates}
                    onChange={onStagedStatesChange}
                    options={incStateChoiceQuery?.data ?? []}
                    isLoading={incStateChoiceQuery.isLoading}
                    error={incStateChoiceQuery.isError}
                    errorMessage={getApiErrorMessage(incStateChoiceQuery.error) ?? ''}
                    onRefetch={incStateChoiceQuery.refetch}
                    placeholder="Select States..."
                    className="w-full text-xs"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <span className="font-bold text-slate-500 tracking-wider text-[0.625rem] uppercase">Priority</span>
                <MultiSelectInput
                    value={stagedPriorities}
                    onChange={onStagedPrioritiesChange}
                    options={TICKET_PRIORITY_OPTIONS.filter((p) => Number(p.value) <= 2)}
                    placeholder="Select Priorities..."
                    className="w-full text-xs"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <span className="font-bold text-slate-500 tracking-wider text-[0.625rem] uppercase">Assignment Group</span>
                <MultiSelectInput
                    id={'Select Assignment Groups'}
                    value={stagedAssignmentGroups}
                    onChange={onStagedAssignmentGroupsChange}
                    options={userAssignmentGroupsQuery?.data}
                    isLoading={userAssignmentGroupsQuery?.isLoading}
                    error={userAssignmentGroupsQuery?.isError}
                    errorMessage={getApiErrorMessage(userAssignmentGroupsQuery?.error) ?? ''}
                    onRefetch={userAssignmentGroupsQuery?.refetch}
                    placeholder="Select Assignment Groups..."
                    className="w-full text-xs"
                />
            </div>
        </div>
    );
};

export default IncidentAdvancedFilters;
