import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

import SopBaseTemplate from '../components/ui/SopBaseTemplate';
import type { SopCardData } from '../components/ui/SopBaseTemplate';
import DeleteConfirmationModal from '../components/ui/DeleteConfirmationModal';
import { EmptyPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';

import { useSOPQueries } from '../hooks/useSOPQueries';
import { useDeleteSOPMutation } from '../hooks/useDeleteSOPMutation';
import type { SOP } from '../types/sop';

export default function AiGeneratedSopsPage() {
    const { sopsQuery, aiPendingSops } = useSOPQueries();
    const deleteMutation = useDeleteSOPMutation();
    const navigate = useNavigate();

    const [sopToDelete, setSopToDelete] = useState<SOP | null>(null);

    const mappedSops: SopCardData[] = aiPendingSops.map((sop) => ({
        id: String(sop.id),
        title: sop.sop_name,
        author: sop.created_by ?? 'AI',
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

    return (
        <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            {deleteMutation.isPending && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-2 text-sm font-semibold shadow-md animate-pulse">
                    Synchronizing vector indexes and removing records...
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
                <EmptyPlaceholder message="No AI Generated SOPs found !" isRefetching={sopsQuery.isFetching} onRetry={() => sopsQuery.refetch()} />
            ) : null}

            {!sopsQuery.isLoading && !sopsQuery.isError && mappedSops.length > 0 ? (
                <SopBaseTemplate
                    pageTitle="AI Generated SOPs"
                    items={mappedSops}
                    showSidebar={true}
                    onRefresh={() => sopsQuery.refetch()}
                    isRefreshing={sopsQuery.isFetching}
                    onEnhance={(sopItem) => {
                        const originalSop = aiPendingSops.find((s) => String(s.id) === sopItem.id);

                        navigate({
                            to: '/faste-ai/sop-dashboard/sop-generator',
                            state: (prev) =>
                                ({
                                    ...prev,
                                    enhanceContent: `Enhancing By fasteai\n\n${sopItem.sop_content ?? ''}`,
                                    sopData: originalSop || sopItem,
                                }) as Record<string, unknown>,
                        });
                    }}
                    onDelete={(id) => {
                        const targetSop = aiPendingSops.find((s) => String(s.id) === id);
                        if (targetSop) {
                            setSopToDelete(targetSop);
                        }
                    }}
                />
            ) : null}

            <DeleteConfirmationModal
                isOpen={Boolean(sopToDelete)}
                title="Delete AI Generated SOP"
                itemName={sopToDelete?.sop_name ?? ''}
                isDeleting={deleteMutation.isPending}
                onClose={() => setSopToDelete(null)}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
