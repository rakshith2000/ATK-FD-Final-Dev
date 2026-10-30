import { useMemo, useState } from 'react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { useQueryClient } from '@tanstack/react-query';
import type { Meeting } from '@/modules/meeting-ai/types/meeting-ai';
import { useMeetingsByGroupAndUserQuery } from '@/modules/meeting-ai/hooks/useMeetingsByGroupAndUserQuery';
import { useDeleteMeetingByIdMutation } from '@/modules/meeting-ai/hooks/useDeleteMeetingByIdMutation';
import { parseGroups } from '@/modules/meeting-ai/utils/parse-groups';
import MeetingCard from '../../ui/MeetingCard/MeetingCard';
import MeetingHistoryHeader from '../../ui/MeetingHistoryHeader/MeetingHistoryHeader';
import { EmptyPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';
import globalAlertToastEventBus from '@/shared/components/smart/GlobalAlertToast/global-alert-toast-event-bus';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';

export interface MeetingHistoryListProps {
    groups: string;
    onMeetingClick: (meeting: Meeting) => void;
    onAddClick?: () => void;
    className?: ClassNameValue;
}

const MeetingHistoryList: React.FC<MeetingHistoryListProps> = ({ groups, onMeetingClick, onAddClick, className }) => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

    const { data: meetings = [], isLoading, isError, error, refetch, isRefetching, queryKey: meetingsQueryKey } = useMeetingsByGroupAndUserQuery(groups);

    const deleteMutation = useDeleteMeetingByIdMutation();
    const deletingMeetingId = deleteMutation.isPending ? deleteMutation.variables?.meetingId : undefined;

    const groupOptions = useMemo(() => {
        const set = new Set<string>();
        meetings.forEach((m) => {
            parseGroups(m.groups).forEach((g) => set.add(g));
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [meetings]);

    const filteredMeetings = useMemo(() => {
        const lower = search.toLowerCase().trim();
        return meetings.filter((m) => {
            const matchesSearch = !lower || JSON.stringify(m).toLowerCase().includes(lower);
            const meetingGroups = parseGroups(m.groups);
            const matchesGroup = selectedGroups.length === 0 || selectedGroups.some((g) => meetingGroups.includes(g));
            return matchesSearch && matchesGroup;
        });
    }, [meetings, search, selectedGroups]);

    const handleDelete = (meeting: Meeting) => {
        globalAlertDialogEventBus.emit('show-dialog', {
            title: 'Delete meeting?',
            note: `"${meeting.title}" will be permanently removed. This action cannot be undone.`,
            severity: 'warning',
            actions: [
                {
                    label: 'Delete',
                    variant: 'error',
                    onClick: () => {
                        deleteMutation.mutate(
                            { meetingId: meeting.id },
                            {
                                onSuccess: () => {
                                    globalAlertToastEventBus.emit('show-alert-toast', {
                                        title: 'Meeting deleted',
                                        description: `"${meeting.title}" was removed.`,
                                        severity: 'success',
                                        position: 'top-center',
                                    });
                                    queryClient.invalidateQueries({ queryKey: meetingsQueryKey });
                                },
                            },
                        );
                    },
                },
                {
                    label: 'Cancel',
                    variant: 'info',
                    onClick: () => {},
                },
            ],
        });
    };

    return (
        <div className={twMerge('flex flex-col h-full min-h-0', className)}>
            <MeetingHistoryHeader
                search={search}
                onSearchChange={setSearch}
                groupOptions={groupOptions}
                selectedGroups={selectedGroups}
                onGroupsChange={setSelectedGroups}
                onAddClick={onAddClick}
            />

            <div className="flex-1 overflow-y-auto px-3 pb-3">
                {isLoading ? (
                    <GridSkeleton rows={3} cols={3} className="p-2" />
                ) : isError ? (
                    <ErrorPlaceholder error={error} onRetry={() => refetch()} isRefetching={isRefetching} />
                ) : filteredMeetings.length === 0 ? (
                    <EmptyPlaceholder message="No meetings found" />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                        {filteredMeetings.map((m) => (
                            <MeetingCard key={m.id} meeting={m} onClick={onMeetingClick} onDelete={handleDelete} isDeleting={deletingMeetingId === m.id} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

MeetingHistoryList.displayName = 'MeetingHistoryList';

export default MeetingHistoryList;
