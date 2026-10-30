import { useEffect, useState } from 'react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { MeetingId, MeetingKnowledgeArticle } from '@/modules/meeting-ai/types/meeting-ai';
import { useMeetingDetailsByIdQuery } from '@/modules/meeting-ai/hooks/useMeetingDetailsByIdQuery';
import { useUpdateMeetingGroupsByIdMutation } from '@/modules/meeting-ai/hooks/useUpdateMeetingGroupsByIdMutation';
import { meetingsByGroupAndUserQueryKey } from '@/modules/meeting-ai/hooks/useMeetingsByGroupAndUserQuery';
import { parseGroups } from '@/modules/meeting-ai/utils/parse-groups';
import MeetingDetailsTabs, { type MeetingDetailsTab } from '../../ui/MeetingDetailsTabs/MeetingDetailsTabs';
import MeetingTranscriptView from '../../ui/MeetingTranscriptView/MeetingTranscriptView';
import MeetingSummaryView from '../../ui/MeetingSummaryView/MeetingSummaryView';
import MeetingKnowledgeArticlesView from '../../ui/MeetingKnowledgeArticlesView/MeetingKnowledgeArticlesView';
import { LoadingPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import globalAlertToastEventBus from '@/shared/components/smart/GlobalAlertToast/global-alert-toast-event-bus';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';

export interface MeetingDetailsPanelProps {
    meetingId: MeetingId;
    groupOptions: string[];
    onBack: () => void;
    onAssistantOpen?: () => void;
    onCreateKb?: (article: MeetingKnowledgeArticle) => void;
    onViewArchived?: () => void;
    onRefresh?: () => void;
    className?: ClassNameValue;
}

const MeetingDetailsPanel: React.FC<MeetingDetailsPanelProps> = ({ meetingId, groupOptions, onBack, onAssistantOpen, onCreateKb, onViewArchived, onRefresh, className }) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<MeetingDetailsTab>('Summary');
    const [summaryGroups, setSummaryGroups] = useState<string[]>([]);

    const { data: details, isLoading, isError, error, refetch, isRefetching, queryKey: detailsQueryKey } = useMeetingDetailsByIdQuery(meetingId);
    const updateGroupsMutation = useUpdateMeetingGroupsByIdMutation();

    useEffect(() => {
        const meetingGroups = parseGroups(details?.meeting?.groups);
        if (meetingGroups.length === 0) {
            setSummaryGroups([]);
            return;
        }
        const matched = groupOptions.filter((opt) => meetingGroups.some((g) => g.toLowerCase() === opt.toLowerCase()));
        setSummaryGroups(matched);
    }, [details?.meeting?.groups, groupOptions]);

    const handleUpdateGroups = () => {
        updateGroupsMutation.mutate(
            { meetingId, groups: { groups: summaryGroups.join('|') } },
            {
                onSuccess: () => {
                    globalAlertToastEventBus.emit('show-alert-toast', {
                        title: 'Groups updated',
                        description: 'Meeting groups updated successfully.',
                        severity: 'success',
                        position: 'top-center',
                    });
                    queryClient.invalidateQueries({ queryKey: detailsQueryKey });
                    queryClient.invalidateQueries({ queryKey: [meetingsByGroupAndUserQueryKey[0]] });
                },
            },
        );
    };

    if (isLoading) return <LoadingPlaceholder message="Loading meeting details..." />;
    if (isError) return <ErrorPlaceholder error={error} onRetry={() => refetch()} isRefetching={isRefetching} />;
    if (!details) return null;

    return (
        <div className={twMerge('flex flex-col h-full min-h-0 bg-white', className)}>
            <div className="flex items-center justify-between gap-2 p-2  shrink-0">
                <span className="text-sm font-bold text-(--brand-title-primary-color) truncate">{details.meeting?.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex items-center gap-1 rounded text-black px-2 py-1 text-xs font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={14} className="text-(--brand-color)" />
                        Back
                    </button>
                    {onAssistantOpen && (
                        <FormActionButton
                            variant="brand"
                            onClick={onAssistantOpen}
                            icon={<MessageSquare size={14} />}
                            label="Meeting Assistant"
                            className="min-w-32! 2xl:min-w-40! rounded-full! text-xs! 2xl:text-sm!"
                            isSubmitting={false}
                            submittingLabel={''}
                        />
                    )}
                </div>
            </div>

            <MeetingDetailsTabs activeTab={activeTab} onTabChange={setActiveTab} onRefresh={onRefresh} isRefreshing={isRefetching} />

            <div className="flex-1 overflow-y-auto px-3 py-3">
                {activeTab === 'Summary' && (
                    <MeetingSummaryView
                        meeting={details.meeting}
                        summary={details.summary}
                        groupOptions={groupOptions}
                        summaryGroups={summaryGroups}
                        onSummaryGroupsChange={setSummaryGroups}
                        onUpdateGroups={handleUpdateGroups}
                        isUpdating={updateGroupsMutation.isPending}
                    />
                )}

                {activeTab === 'Transcript' && <MeetingTranscriptView transcripts={details.transcripts} />}

                {activeTab === 'Knowledge Articles' && (
                    <MeetingKnowledgeArticlesView articles={details.knowledge_articles} onViewArchived={onViewArchived} onCreateKb={onCreateKb} />
                )}
            </div>
        </div>
    );
};

MeetingDetailsPanel.displayName = 'MeetingDetailsPanel';

export default MeetingDetailsPanel;
