import { useState } from 'react';
import IncidentAnalyticsGroupByState from '../components/smart/IncidentAnalyticsGroupByState/IncidentAnalyticsGroupByState';
import MajorIncidentsTable from '../components/smart/MajorIncidentsTable/MajorIncidentsTable';
import { RosterActions } from '../components/ui/RosterActions/RosterActions';
import { IncidentFilterButton } from '../components/ui/IncidentFilterButton/IncidentFilterButton';
import AdvancedDateFilter, { defaultDateFilter, getDateRangeFromFilter, type DateFilterValue } from '@/shared/components/ui/AdvancedDateFilter/AdvancedDateFilter';
import { useTicketFieldChoiceQuery } from '@/shared/modules/servicenow/hooks/useTicketFieldChoiceQuery';

const defaultOptions = {
    stagedPriorities: ['1'],
    selectedPriorities: ['1'],
    stagedStates: ['1', '2', '3', '6', '7', '8'],
    selectedStates: ['1', '2', '3', '6', '7', '8'],
    stagedGroups: [],
    selectedGroups: [],
};

const MIMDashboardPage = () => {
    useTicketFieldChoiceQuery('incident', 'state');
    const [selectedState, setSelectedState] = useState<string | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

    // Date filter state
    const [dateFilter, setDateFilter] = useState<DateFilterValue>(defaultDateFilter);
    const dateRange = getDateRangeFromFilter(dateFilter);

    // Advanced filters state
    const [stagedPriorities, setStagedPriorities] = useState<string[]>(defaultOptions.stagedPriorities);
    const [selectedPriorities, setSelectedPriorities] = useState<string[]>(defaultOptions.selectedPriorities);
    const [stagedStates, setStagedStates] = useState<string[]>(defaultOptions.stagedStates);
    const [selectedStates, setSelectedStates] = useState<string[]>(defaultOptions.stagedStates);
    const [stagedGroups, setStagedGroups] = useState<string[]>(defaultOptions.stagedGroups);
    const [selectedGroups, setSelectedGroups] = useState<string[]>(defaultOptions.selectedGroups);

    const activePriorities = selectedPriorities.map(Number);
    const activeStates = selectedStates.map(Number);

    return (
        <div id="mim-dashboard" className="w-full h-full flex flex-col gap-1 p-0.5 overflow-hidden bg-gray-50/50">
            <div className="rounded-md border border-gray-100 p-1">
                {/* Dashboard Header */}
                <div className="flex flex-col md:flex-row items-center md:justify-between pb-1 px-1 shrink-0 gap-3">
                    <div>
                        <h1 className="text-sm font-bold text-gray-800 tracking-tight">Major Incident Dashboard</h1>
                        <p className="text-[0.6rem] text-gray-400 font-medium">Major Incidents list with realtime analytics</p>
                    </div>

                    <div className="flex items-center gap-2 relative">
                        <RosterActions />
                        <AdvancedDateFilter
                            title="Incident Created On Filter"
                            value={dateFilter}
                            onChange={(val) => {
                                setDateFilter(val);
                                setSelectedState(null);
                                setSelectedGroup(null);
                            }}
                        />
                        <IncidentFilterButton
                            stagedPriorities={stagedPriorities}
                            onStagedPrioritiesChange={setStagedPriorities}
                            stagedStates={stagedStates}
                            onStagedStatesChange={setStagedStates}
                            stagedGroups={stagedGroups}
                            onStagedGroupsChange={setStagedGroups}
                            selectedPriorities={selectedPriorities}
                            selectedStates={selectedStates}
                            selectedGroups={selectedGroups}
                            defaultOptions={defaultOptions}
                            onApply={() => {
                                setSelectedPriorities(stagedPriorities);
                                setSelectedStates(stagedStates);
                                setSelectedState(null);
                                setSelectedGroups(stagedGroups);
                                setSelectedGroup(null);
                            }}
                            onReset={() => {
                                setSelectedPriorities(defaultOptions.selectedPriorities);
                                setSelectedStates(defaultOptions.selectedStates);
                                setStagedPriorities(defaultOptions.stagedPriorities);
                                setStagedStates(defaultOptions.stagedStates);
                                setSelectedState(null);
                                setSelectedGroups([]);
                                setSelectedGroup(null);
                            }}
                        />
                    </div>
                </div>
                <IncidentAnalyticsGroupByState
                    selectedState={selectedState}
                    onStateSelect={(state: string | null) => {
                        setSelectedState(state);
                        setSelectedGroup(null);
                    }}
                    selectedGroup={selectedGroup}
                    onGroupSelect={(group) => {
                        setSelectedGroup(group);
                        setSelectedState(null);
                    }}
                    priorities={activePriorities}
                    states={activeStates}
                    groups={selectedGroups}
                    dateRange={dateRange}
                />
            </div>
            <div className="flex-1 min-h-0 rounded-lg border border-gray-100 shadow overflow-hidden">
                <MajorIncidentsTable
                    selectedState={selectedState}
                    onStateSelect={setSelectedState}
                    selectedGroup={selectedGroup}
                    onGroupSelect={setSelectedGroup}
                    priorities={activePriorities}
                    states={activeStates}
                    groups={selectedGroups}
                    dateRange={dateRange}
                />
            </div>
        </div>
    );
};

export default MIMDashboardPage;
