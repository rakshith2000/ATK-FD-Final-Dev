import { useState } from 'react';
import SopApprovalBaseTemplate from '../components/ui/SopApprovalBaseTemplate';
import type { SopCardData } from '../components/ui/SopApprovalBaseTemplate';
import DeleteConfirmationModal from '../components/ui/DeleteConfirmationModal';
import Modal from '@/shared/components/ui/Modal/Modal';
import { EmptyPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';
import { useNavigate } from '@tanstack/react-router';

import { useSOPQueries } from '../hooks/useSOPQueries';
import { useDeleteSOPMutation } from '../hooks/useDeleteSOPMutation';
import { useApproveSOPMutation } from '../hooks/useApproveSOPMutation';
import type { SOP } from '../types/sop';

export default function AwaitingApprovalSopsPage() {
    const { sopsQuery, allAwaitingApprovalSops } = useSOPQueries();
    const deleteMutation = useDeleteSOPMutation();
    const approveMutation = useApproveSOPMutation();
    const navigate = useNavigate();

    const [sopToDelete, setSopToDelete] = useState<SOP | null>(null);
    const [sopToApprove, setSopToApprove] = useState<SOP | null>(null);

    const mappedSops: SopCardData[] = allAwaitingApprovalSops.map((sop) => ({
        id: String(sop.id),
        title: sop.sop_name,
        author: sop.created_by ?? 'Unknown Creator',
        status: 'Awaiting Approval',
        category: sop.category as SopCardData['category'],
        sop_content: sop.sop_content,
        sop_type: (sop as unknown as { sop_type?: string }).sop_type,
        u_sop_type: (sop as unknown as { u_sop_type?: string }).u_sop_type,
        kb_number: sop.kb_number,
    }));

    const handleConfirmDelete = () => {
        if (sopToDelete) {
            deleteMutation.mutate(sopToDelete, {
                onSettled: () => setSopToDelete(null),
            });
        }
    };

    const handleConfirmApprove = () => {
        if (sopToApprove) {
            approveMutation.mutate(sopToApprove, {
                onSuccess: () => {
                    setSopToApprove(null);
                    navigate({ to: '/faste-ai/sop-dashboard/available' });
                },
                onError: () => {
                    setSopToApprove(null);
                },
            });
        }
    };

    return (
        <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            {(deleteMutation.isPending || approveMutation.isPending) && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-[#011a80] text-white text-center py-2.5 text-sm font-semibold shadow-md animate-pulse tracking-wide">
                    {approveMutation.isPending
                        ? 'Synchronizing vector embeddings and transferring data to Available SOP matrix...'
                        : 'Synchronizing vector indexes and removing records...'}
                </div>
            )}

            {sopsQuery.isLoading ? (
                <div className="border border-gray-50 bg-white rounded-xl p-2">
                    <GridSkeleton GAP={4} rows={1} cols={5} VW={1200} />
                </div>
            ) : null}

            {sopsQuery.isError ? (
                <div className="border border-gray-50 bg-white rounded-xl p-5">
                    <ErrorPlaceholder iconSize={100} error={sopsQuery.error} onRetry={() => sopsQuery.refetch()} />
                </div>
            ) : null}

            {!sopsQuery.isLoading && !sopsQuery.isError && mappedSops.length === 0 ? (
                <EmptyPlaceholder message="No SOPs awaiting approval found !" isRefetching={sopsQuery.isFetching} onRetry={() => sopsQuery.refetch()} />
            ) : null}

            {!sopsQuery.isLoading && !sopsQuery.isError && mappedSops.length > 0 ? (
                <SopApprovalBaseTemplate
                    pageTitle="SOPs Awaiting Approval"
                    items={mappedSops}
                    showSidebar={true}
                    onRefresh={() => sopsQuery.refetch()}
                    isRefreshing={sopsQuery.isFetching}
                    onApprove={(sopItem) => {
                        const originalSop = allAwaitingApprovalSops.find((s) => String(s.id) === sopItem.id);
                        if (originalSop) {
                            setSopToApprove(originalSop);
                        }
                    }}
                    onDelete={(id) => {
                        const targetSop = allAwaitingApprovalSops.find((s) => String(s.id) === id);
                        if (targetSop) {
                            setSopToDelete(targetSop);
                        }
                    }}
                />
            ) : null}

            <DeleteConfirmationModal
                isOpen={Boolean(sopToDelete)}
                title="Delete Pending SOP"
                itemName={sopToDelete?.sop_name ?? ''}
                isDeleting={deleteMutation.isPending}
                onClose={() => setSopToDelete(null)}
                onConfirm={handleConfirmDelete}
            />

            <Modal
                open={Boolean(sopToApprove)}
                onClose={() => !approveMutation.isPending && setSopToApprove(null)}
                size="md"
                className="p-0 overflow-hidden rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
                <Modal.Header className="p-6 border-b border-gray-100 dark:border-gray-700 bg-[#f8fafd] dark:bg-gray-800/50">
                    <h2 className="text-base font-bold text-[#011a80] dark:text-white m-0">Confirm Approval</h2>
                </Modal.Header>

                <Modal.Body className="p-6 bg-white dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-300 space-y-2 mb-0">
                    <p>
                        Are you sure you want to approve <strong>{sopToApprove?.sop_name}</strong>?
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">This will update the approval status and Vectorized SOP content.</p>
                </Modal.Body>

                <Modal.Footer className="p-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 items-center rounded-b-3xl">
                    <button
                        type="button"
                        disabled={approveMutation.isPending}
                        onClick={() => setSopToApprove(null)}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all disabled:opacity-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={approveMutation.isPending}
                        onClick={handleConfirmApprove}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#2a9619] hover:bg-[#1e6b12] shadow-sm transition-all flex items-center justify-center min-w-22.5 disabled:opacity-50 cursor-pointer"
                    >
                        {approveMutation.isPending ? <span className="flex items-center gap-1.5 animate-pulse">Approving...</span> : 'Approve'}
                    </button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
