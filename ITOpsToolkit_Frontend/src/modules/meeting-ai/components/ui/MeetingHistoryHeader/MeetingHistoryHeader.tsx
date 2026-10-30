import { Plus, Search } from 'lucide-react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import MultiSelectInput from '@/shared/components/ui/InputFields/MultiSelectInput';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import { useDebouncedSearchInput } from '@/modules/meeting-ai/hooks/useDebouncedSearchInput';
import { useResponsiveMaxChips } from '@/modules/meeting-ai/hooks/useResponsiveMaxChips';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';

export interface MeetingHistoryHeaderProps {
    search: string;
    onSearchChange: (value: string) => void;
    groupOptions: string[];
    selectedGroups: string[];
    onGroupsChange: (values: string[]) => void;
    onAddClick?: () => void;
    className?: ClassNameValue;
}

const MeetingHistoryHeader: React.FC<MeetingHistoryHeaderProps> = ({ search, onSearchChange, groupOptions, selectedGroups, onGroupsChange, onAddClick, className }) => {
    const { inputValue: searchInputValue, onChange: onSearchInputChange } = useDebouncedSearchInput(search, onSearchChange);
    const groupFilterMaxChips = useResponsiveMaxChips({ mobile: 1, tablet: 1, desktop: 2 });

    return (
        <div className={twMerge('flex items-center justify-between gap-3 px-4 py-2', className)}>
            <div className="flex flex-col items-start shrink-0">
                <TitleWithArraow title="MEETING HISTORY" />
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-xl">
                <div className="relative flex-1 ">
                    <Search size={12} className="size-3 2xl:size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        className="w-full pl-6 min-h-7  pr-2 py-1  text-xs  rounded-full border border-gray-300 bg-white hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-500"
                        placeholder="Search meetings..."
                        value={searchInputValue}
                        onChange={(e) => onSearchInputChange(e.target.value)}
                    />
                </div>

                <div className="w-44">
                    <MultiSelectInput
                        options={groupOptions.map((g) => ({ value: g, label: g }))}
                        value={selectedGroups}
                        onChange={onGroupsChange}
                        placeholder="Filter by group"
                        triggerClassName="rounded-full!"
                        maxChips={groupFilterMaxChips}
                    />
                </div>

                {onAddClick && (
                    <FormActionButton
                        variant="brand"
                        onClick={onAddClick}
                        label="Add Meeting"
                        icon={<Plus className="size-3.5 2xl:size-4" />}
                        className="min-w-32! 2xl:min-w-40! rounded-full! text-xs! 2xl:text-sm! shrink-0 inline-flex items-center gap-1"
                        isSubmitting={false}
                        submittingLabel={''}
                    />
                )}
            </div>
        </div>
    );
};

MeetingHistoryHeader.displayName = 'MeetingHistoryHeader';

export default MeetingHistoryHeader;
