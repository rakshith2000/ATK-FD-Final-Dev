import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { LoaderCircle } from 'lucide-react';
import type { Meeting } from '@/modules/meeting-ai/types/meeting-ai';
import { useResponsiveMaxChips } from '@/modules/meeting-ai/hooks/useResponsiveMaxChips';
import MultiSelectInput from '@/shared/components/ui/InputFields/MultiSelectInput';
import { EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import RenderMarkdown from '@/shared/components/smart/RenderMarkdown/RenderMarkdown';

export interface MeetingSummaryViewProps {
    meeting?: Meeting;
    summary?: string;
    groupOptions: string[];
    summaryGroups: string[];
    onSummaryGroupsChange: (values: string[]) => void;
    onUpdateGroups: () => void;
    isUpdating?: boolean;
    className?: ClassNameValue;
}

const MeetingSummaryView: React.FC<MeetingSummaryViewProps> = ({ meeting, summary, groupOptions, summaryGroups, onSummaryGroupsChange, onUpdateGroups, isUpdating, className }) => {
    const participants = meeting?.participants ?? [];
    const groupChipsMax = useResponsiveMaxChips({ mobile: 1, tablet: 2, desktop: 2 });
    const hasSummary = !!summary?.trim();

    return (
        <div className={twMerge('flex flex-col gap-3', className)}>
            {participants.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {participants.map((p) => (
                        <span key={p} className="inline-block rounded border border-[#DDDBDB]  text-(--ticket-id-color) px-3 py-1 text-xs font-medium shadow-sm ">
                            {p}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex flex-col gap-1">
                <p className="pl-2 text-xs text-(--brand-color) font-bold"> Select and Update Groups </p>
                <div className="flex items-center  gap-2">
                    <div className="w-56 ">
                        <MultiSelectInput
                            options={groupOptions.map((g) => ({ value: g, label: g }))}
                            value={summaryGroups}
                            onChange={onSummaryGroupsChange}
                            placeholder="Select groups"
                            maxChips={groupChipsMax}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onUpdateGroups}
                        disabled={isUpdating || summaryGroups.length === 0}
                        className="inline-flex items-center gap-1 rounded text-white px-3 py-1 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-transform border-none border-transparent btn-split split-blue"
                    >
                        <span>
                            {isUpdating && <LoaderCircle size={12} className="animate-spin" />}
                            Update
                        </span>
                    </button>
                </div>
            </div>

            {hasSummary ? (
                <div className="rounded-md border border-(--brand-border-color) bg-white p-3 brand-box-show-inset">
                    <RenderMarkdown text={summary!} />
                </div>
            ) : (
                <EmptyPlaceholder message="No summary available" />
            )}
        </div>
    );
};

MeetingSummaryView.displayName = 'MeetingSummaryView';

export default MeetingSummaryView;
