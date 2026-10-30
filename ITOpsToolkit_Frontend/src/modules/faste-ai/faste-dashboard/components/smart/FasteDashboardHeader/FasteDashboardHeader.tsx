import React from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { TextInput } from '@/shared/components/ui/InputFields';
import { YearFilter } from '../../ui/YearFilter/YearFilter';

export type AssignmentFilterType = 'assigned-to-user' | 'assignment-group' | 'unassigned';

export interface FasteDashboardHeaderProps {
    activeTab: 'dashboard' | 'tickets';
    setActiveTab: React.Dispatch<React.SetStateAction<'dashboard' | 'tickets'>>;
    searchValue: string;
    onSearchChange: React.Dispatch<React.SetStateAction<string>>;
    assignmentFilter?: AssignmentFilterType;
    setAssignmentFilter?: React.Dispatch<React.SetStateAction<AssignmentFilterType>>;
    selectedYear: string;
    setSelectedYear: React.Dispatch<React.SetStateAction<string>>;
    filterOpen: boolean;
    setFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onFilterChange?: (filterData: { mode: string; year: string | null; quarter: number | null; month: number | null; start: Date | null; end: Date | null }) => void;
}

export const FasteDashboardHeader: React.FC<FasteDashboardHeaderProps> = ({
    activeTab,
    setActiveTab,
    searchValue,
    onSearchChange,
    assignmentFilter: _assignmentFilter,
    setAssignmentFilter: _setAssignmentFilter,
    selectedYear,
    setSelectedYear,
    filterOpen,
    setFilterOpen,
    onFilterChange,
}) => {
    const yearsList = ['2024', '2025', '2026', '2027'];

    const renderThreeButtons = () => (
        <div className="flex items-center gap-2 flex-wrap">
            <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`cursor-pointer px-2.5 py-1 rounded-[8px] text-[14px] font-bold border transition-all duration-250 ease-in-out ${
                    activeTab === 'dashboard' ? 'bg-[#011A80] text-white border-[#011A80] shadow-sm' : 'bg-[#F0F7FF] text-[#3D54D0] border-[#BBDDFF] hover:bg-[#e4f0fd]'
                }`}
            >
                Analytics Dashboard
            </button>

            <button
                type="button"
                onClick={() => setActiveTab('tickets')}
                className={`cursor-pointer px-2.5 py-1 rounded-[8px] text-[14px] font-semibold border transition-all duration-250 ease-in-out ${
                    activeTab === 'tickets' ? 'bg-[#011A80] text-white border-[#011A80] shadow-sm' : 'bg-[#F0F7FF] text-[#3D54D0] border-[#BBDDFF] hover:bg-[#e4f0fd]'
                }`}
            >
                Active Tickets
            </button>

            <div className="rounded [&_button]:bg-[#F0F7FF] [&_button]:border-[#BBDDFF] [&_button]:text-[#3D54D0] [&_button]:px-2.5 [&_button]:py-1 [&_button]:rounded-[8px] [&_button]:text-[14px] [&_button]:font-semibold [&_button]:cursor-pointer [&_button:hover]:bg-[#e4f0fd] transition-all duration-250 ease-in-out">
                <YearFilter
                    selectedYear={selectedYear}
                    setSelectedYear={setSelectedYear}
                    filterOpen={filterOpen}
                    setFilterOpen={setFilterOpen}
                    yearsList={yearsList}
                    onFilterChange={onFilterChange}
                />
            </div>
        </div>
    );

    return (
        <div className={`w-full flex flex-col md:flex-row items-center gap-4 mb-4 ${activeTab === 'dashboard' ? 'justify-start' : 'justify-between'}`}>
            {activeTab === 'dashboard' && renderThreeButtons()}

            {activeTab === 'tickets' && (
                <>
                    <div className="flex flex-wrap items-center gap-4 grow">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className="p-1.5 text-[#3D54D0] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            title="Back to Dashboard"
                        >
                            <FiArrowLeft size={20} className="stroke-[2.5]" />
                        </button>
                        <h4 className="text-[#3D54D0] font-bold text-lg m-0 whitespace-nowrap">Active Tickets</h4>

                        <div className="w-full sm:w-55">
                            <TextInput value={searchValue} onChange={onSearchChange} placeholder="Search Number" />
                        </div>
                    </div>

                    <div className="shrink-0 ml-auto">{renderThreeButtons()}</div>
                </>
            )}
        </div>
    );
};

export default FasteDashboardHeader;
