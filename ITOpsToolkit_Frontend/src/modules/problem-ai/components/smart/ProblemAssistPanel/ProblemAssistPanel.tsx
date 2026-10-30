import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import { LoadingPlaceholder } from '@/shared/components/ui/Placeholders';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import globalSuccessAlertEventBus from '@/shared/components/smart/GlobalSuccessAlert/global-success-alert-event-bus';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import { Check, X } from 'lucide-react';
import type { AssociatedIncident, ProblemTicket } from '../../../types/problem-ai';
import type { ProblemStatusFilter } from '../../../constants/problem-status-filter-options';
import { useUpdateProblemTicketDetailsMutation } from '../../../hooks/useUpdateProblemTicketDetailsMutation';
import { usePushProblemTicketToItsmMutation } from '../../../hooks/usePushProblemTicketToItsmMutation';
import { problemTicketsQueryKey } from '../../../hooks/useProblemTicketsQuery';
import ProblemDetailsForm from '../ProblemDetailsForm/ProblemDetailsForm';
import AssociatedIncidentsTable from '../AssociatedIncidentsTable/AssociatedIncidentsTable';
import RejectReasonModal from '../../ui/RejectReasonModal/RejectReasonModal';

interface ProblemAssistPanelProps {
    ticket: ProblemTicket;
    status: ProblemStatusFilter;
    onClose: () => void;
}
const REQUIRED_FIELDS_MAP: Record<string, string> = {
    short_description: 'Short Description',
    description: 'Description',
    assignment_group: 'Assignment Group',
    assigned_to: 'Assigned To',
    urgency: 'Urgency',
    impact: 'Impact',
};

const ProblemAssistPanel: React.FC<ProblemAssistPanelProps> = ({ ticket, status, onClose }) => {
    const queryClient = useQueryClient();
    const { state: authState } = useAuth();
    const currentUser = authState?.user?.displayName ?? authState?.user?.username ?? '';

    const [draft, setDraft] = useState<ProblemTicket>(ticket);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedIncidents, setSelectedIncidents] = useState<AssociatedIncident[]>([]);

    useEffect(() => {
        setDraft(ticket);
        setRejectionReason('');
        setSelectedIncidents([]);
    }, [ticket]);

    const updateDetailsMutation = useUpdateProblemTicketDetailsMutation();
    const pushToItsmMutation = usePushProblemTicketToItsmMutation();

    const isSubmitting = updateDetailsMutation.isPending || pushToItsmMutation.isPending;

    const invalidateProblemList = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: problemTicketsQueryKey });
    }, [queryClient]);

    const showToast = useCallback((title: string, severity: 'success' | 'error' = 'success', description?: string) => {
        globalAlertDialogEventBus.emit('show-dialog', {
            title,
            note: description ?? '',
            severity,
            priority: 'normal',
            buttonText: 'Close',
            buttonClassName: 'w-20 block mx-auto',
        });
    }, []);

    const requireRelatedIncidents = useCallback(() => {
        if (selectedIncidents.length === 0) {
            showToast('Please select at least one Related Incident', 'error');
            return false;
        }
        return true;
    }, [selectedIncidents.length, showToast]);
    const requireField = useCallback(() => {
        const missingField = Object.entries(REQUIRED_FIELDS_MAP).find(([key]) => {
            const val = draft[key as keyof typeof draft];
            // Ensure it is a string before calling .trim()
            return typeof val !== 'string' || !val.trim();
        });

        if (missingField) {
            const [_, label] = missingField;
            showToast(`${label} is required`, 'error');
            return false;
        }

        return true;
    }, [draft.short_description, draft.description, draft.assigned_to, draft.assignment_group, draft.impact, draft.urgency, showToast]);
    const handleReject = async () => {
        if (!rejectionReason.trim()) return;
        try {
            await updateDetailsMutation.mutateAsync(
                {
                    id: draft.id,
                    update_dict: {
                        approval_status: 'proactive_rejected',
                        rejection_reason: rejectionReason,
                    },
                },
                {
                    onSuccess: ({}) => {
                        globalSuccessAlertEventBus.emit('show-alert', {
                            title: 'Success!',
                            note: 'The ticket has been rejected successfully.',
                            noteText: `ID: Rec${draft.id}`,
                            severity: 'brand',
                            buttonText: 'Close',
                            buttonClassName: 'w-50!',
                        });
                    },
                },
            );

            setRejectOpen(false);
            invalidateProblemList();
            onClose();
        } catch {
            /* mutation surfaces an alert */
        }
    };

    const handleApprove = async () => {
        if (!requireField() || !requireRelatedIncidents()) return;

        try {
            const pushed = await pushToItsmMutation.mutateAsync({
                description: draft.description ?? '',
                short_description: draft.short_description ?? '',
                impact: draft.impact ?? '',
                urgency: draft.urgency ?? '',
                assignment_group: draft.assignment_group ?? '',
                assigned_to: draft.assigned_to ?? '',
                cmdb_ci: draft.cmdb_ci ?? '',
                related_incidents: selectedIncidents,
            });

            await updateDetailsMutation.mutateAsync(
                {
                    id: draft.id,
                    update_dict: {
                        approval_status: 'Approved',
                        problem_ticket_number: pushed.number,
                        approver: currentUser,
                        problem_ticket_link: pushed.target_link,
                        description: draft.description ?? '',
                        short_description: draft.short_description ?? '',
                        associated_incidents: selectedIncidents,
                        assigned_to: draft.assigned_to ?? '',
                        assignment_group: draft.assignment_group ?? '',
                        impact: draft.impact ?? '',
                        state: draft.state ?? '',
                        urgency: draft.urgency ?? '',
                    },
                },
                {
                    onSuccess: ({}) => {
                        globalSuccessAlertEventBus.emit('show-alert', {
                            title: 'Success!',
                            note: `Successfully Updated Ticket ${pushed.number || ''}`,
                            buttonText: 'Close',
                            severity: 'brand',
                            buttonClassName: 'w-50!',
                        });
                    },
                },
            );

            invalidateProblemList();
            onClose();
        } catch {
            /* mutation surfaces an alert */
        }
    };

    return (
        <ShellLayout className="rounded">
            <ShellLayout.Header>
                <TitleWithArraow title="PROBLEM RECORD" />
            </ShellLayout.Header>

            <ShellLayout.Body className="relative">
                {isSubmitting ? (
                    <LoadingPlaceholder message="Working..." />
                ) : (
                    <>
                        <div>
                            <ProblemDetailsForm ticket={draft} status={status} onChange={setDraft} />

                            <div className="px-3 2xl:px-4">
                                <AssociatedIncidentsTable incidents={draft?.associated_incidents ?? []} onSelectionChange={setSelectedIncidents} />
                            </div>
                        </div>
                        <div className="flex justify-center gap-3 2xl:gap-4 py-4 2xl:py-6">
                            {status === 'Recommended' ? (
                                <>
                                    <FormActionButton
                                        variant="brand"
                                        isSubmitting={isSubmitting}
                                        onClick={handleApprove}
                                        label="Approve"
                                        submittingLabel="Approving..."
                                        icon={<Check className="size-3.5 2xl:size-4" />}
                                        className="min-w-32! 2xl:min-w-40! rounded-full! text-xs! 2xl:text-sm!"
                                    />
                                    <FormActionButton
                                        isSubmitting={false}
                                        onClick={() => {
                                            if (!requireField() || !requireRelatedIncidents()) return;
                                            setRejectOpen(true);
                                        }}
                                        label="Reject"
                                        submittingLabel="Reject"
                                        icon={<X className="size-3.5 2xl:size-4" />}
                                        className="min-w-32! 2xl:min-w-40! rounded-full! text-xs! 2xl:text-sm! btn-split split-white-blue-light"
                                    />
                                </>
                            ) : (
                                <>
                                    <FormActionButton
                                        variant="brand"
                                        isSubmitting={isSubmitting}
                                        onClick={handleApprove}
                                        label="Approved"
                                        submittingLabel="Approving..."
                                        icon={<Check className="size-3.5 2xl:size-4" />}
                                        className="min-w-32! 2xl:min-w-40! rounded-full! text-xs! 2xl:text-sm!"
                                    />
                                    <FormActionButton
                                        isSubmitting={false}
                                        onClick={onClose}
                                        label="Cancel"
                                        submittingLabel="Cancel"
                                        icon={<X className="size-3.5 2xl:size-4" />}
                                        className="btn-split split-white-blue-light min-w-32! 2xl:min-w-40! rounded-full! text-xs! 2xl:text-sm!"
                                    />
                                </>
                            )}
                        </div>
                    </>
                )}
            </ShellLayout.Body>

            <RejectReasonModal
                open={rejectOpen}
                reason={rejectionReason}
                onChangeReason={setRejectionReason}
                onClose={() => setRejectOpen(false)}
                onSubmit={handleReject}
                isSubmitting={updateDetailsMutation.isPending}
            />
        </ShellLayout>
    );
};

export default ProblemAssistPanel;
