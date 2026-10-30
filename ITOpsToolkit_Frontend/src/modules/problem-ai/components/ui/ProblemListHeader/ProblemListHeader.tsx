import { twMerge } from 'tailwind-merge';
import { SelectInput } from '@/shared/components/ui/InputFields';
import problemStatusFilterOptions, { type ProblemStatusFilter } from '../../../constants/problem-status-filter-options';
import RefetchButton from '@/shared/components/ui/RefetchButton/RefetchButton';
import TicketsSearchInput from '@/modules/service-request/components/ui/TicketsQueryBar/TicketsSearchInput';

interface ProblemListHeaderProps {
    status: ProblemStatusFilter;
    onStatusChange: (status: ProblemStatusFilter) => void;
    search: string;
    onSearchChange: (value: string) => void;
    onSearchSubmit?: () => void;
    className?: string;
    onRefetch?: () => void;
    isRefetching: boolean;
}

const ProblemListHeader: React.FC<ProblemListHeaderProps> = ({ status, onStatusChange, search, onSearchSubmit, onSearchChange, className, onRefetch, isRefetching }) => {
    return (
        <div className={twMerge('flex items-center justify-between gap-2 2xl:gap-3 p-1 2xl:p-2 bg-white', className)}>
            <div className="relative flex-1 ">
                <TicketsSearchInput value={search} onChange={onSearchChange} onSubmit={onSearchSubmit} className="flex-1 " />
            </div>

            <div className="w-36 2xl:w-44">
                <SelectInput value={status} onChange={(next) => onStatusChange(next as ProblemStatusFilter)} options={problemStatusFilterOptions} clearable={false} />
            </div>

            {onRefetch && <RefetchButton isRefetching={isRefetching} onRefetch={onRefetch} />}
        </div>
    );
};

export default ProblemListHeader;
