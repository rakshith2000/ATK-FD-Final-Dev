import { ExternalLink, KeyRound, LoaderCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { MeetingId, MeetingRetrievalType } from '@/modules/meeting-ai/types/meeting-ai';
import { useMeetingAuthDetailsQuery } from '@/modules/meeting-ai/hooks/useMeetingAuthDetailsQuery';
import { useStartOrRefreshMeetingMutation } from '@/modules/meeting-ai/hooks/useStartOrRefreshMeetingMutation';
import { meetingDetailsQueryKey } from '@/modules/meeting-ai/hooks/useMeetingDetailsByIdQuery';
import { useMeetingTranscriptQuery } from '@/modules/meeting-ai/hooks/useMeetingTranscriptQuery';
import Modal from '@/shared/components/ui/Modal/Modal';
import { LoadingPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import globalAlertToastEventBus from '@/shared/components/smart/GlobalAlertToast/global-alert-toast-event-bus';
import logger from '@/shared/utils/logger';

export interface MeetingAuthorizationModalProps {
    open: boolean;
    meetingId: MeetingId;
    retrievalType: MeetingRetrievalType;
    onClose: () => void;
    onStartSuccess?: (meetingId: MeetingId) => void;
}

const MeetingAuthorizationModal: React.FC<MeetingAuthorizationModalProps> = ({ open, meetingId, retrievalType, onClose, onStartSuccess }) => {
    const queryClient = useQueryClient();

    const { data: authDetails, isLoading, isError, error, refetch, isRefetching } = useMeetingAuthDetailsQuery(meetingId, retrievalType);
    const startMutation = useStartOrRefreshMeetingMutation();
    const transcriptQuery = useMeetingTranscriptQuery(meetingId, retrievalType, false);

    const isStarting = startMutation.isPending || transcriptQuery.isFetching;

    const handleStartMeeting = () => {
        startMutation.mutate(
            { meetingId, retrievalType },
            {
                onSuccess: async () => {
                    try {
                        await transcriptQuery.refetch({ throwOnError: true });
                        queryClient.invalidateQueries({ queryKey: [meetingDetailsQueryKey[0], meetingId] });
                        globalAlertToastEventBus.emit('show-alert-toast', {
                            title: 'Meeting started',
                            description: 'Transcripts and knowledge articles are ready.',
                            severity: 'success',
                            position: 'top-center',
                        });
                        onStartSuccess?.(meetingId);
                    } catch (transcriptError) {
                        logger.debug(transcriptError);
                        globalAlertToastEventBus.emit('show-alert-toast', {
                            title: 'Transcript fetch failed',
                            description: transcriptError instanceof Error ? transcriptError.message : 'Could not load meeting transcript.',
                            severity: 'error',
                            position: 'top-right',
                        });
                    }
                },
            },
        );
    };

    const buttonLabel = startMutation.isPending ? 'Starting...' : transcriptQuery.isFetching ? 'Loading transcript...' : 'Start Meeting';

    return (
        <Modal open={open} onClose={isStarting ? () => {} : onClose} size="lg" closeOnOutsideClick={!isStarting} closeOnEscapeKeyDown={!isStarting} className="pb-5">
            <Modal.Header className=" p-2 bg-(--brand-color) border-b-(--brand-color) text-(--brand-text-inverse)">
                <KeyRound size={16} className="text-white" />
                <span className="text-sm font-bold text-white">Authenticate Meeting</span>
            </Modal.Header>
            <Modal.Body className="text-xs px-4">
                {isLoading && <LoadingPlaceholder message="Loading authorization details..." />}
                {isError && <ErrorPlaceholder error={error} onRetry={() => refetch()} isRefetching={isRefetching} />}
                {!isLoading && !isError && authDetails && (
                    <div className="flex flex-col gap-3 py-2">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-gray-700">Auth Code</span>
                            <code className="block rounded bg-gray-50 border border-gray-200 px-2 py-1 text-xs font-mono text-(--brand-color) select-all">
                                {authDetails.auth_code}
                            </code>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-gray-700">Auth URL</span>
                            <a
                                href={authDetails.auth_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-(--brand-color) underline hover:no-underline text-xs break-all"
                            >
                                <ExternalLink size={12} />
                                {authDetails.auth_url}
                            </a>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Open the auth URL in a new tab and enter the code above. Then click <strong>Start Meeting</strong> below to begin recording.
                        </p>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer className="px-4">
                <Modal.ActionButton onClick={onClose} className="btn-split split-white-blue-light" disabled={isStarting}>
                    Cancel
                </Modal.ActionButton>
                <Modal.ActionButton onClick={handleStartMeeting} variant="brand" disabled={isLoading || isError || isStarting}>
                    {isStarting && <LoaderCircle size={12} className="animate-spin" />}
                    {buttonLabel}
                </Modal.ActionButton>
            </Modal.Footer>
        </Modal>
    );
};

MeetingAuthorizationModal.displayName = 'MeetingAuthorizationModal';

export default MeetingAuthorizationModal;
