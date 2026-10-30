import { HighlightedText, VirtualTable, type VirtualTableColumnDef } from '@/shared/modules/virtual-table';
import React, { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import CopyText from '@/shared/components/ui/CopyText/CopyText';
import FormActionModal from '@/shared/components/ui/FormActionModal/FormActionModal';
import UpdateToolkitPackageConfigForm from '../UpdateToolkitPackageConfigForm/UpdateToolkitPackageConfigForm';
import logger from '@/shared/utils/logger';

export interface ToolkitPackageSummary {
    package_name: string;
    llm_tag: string;
    itsm_tags: string[];
    llm_guards: string[];
}

interface ToolkitPackagesTableProps {
    className?: string;
    data: ToolkitPackageSummary[];
    isLoading: boolean;
    error: Error | null;
    isRefetching: boolean;
    onRefetch: () => void;
}

const ToolkitPackagesTable: React.FC<ToolkitPackagesTableProps> = ({ className, data, isLoading, error, isRefetching, onRefetch }) => {
    const [updatingPackage, setUpdatingPackage] = useState<ToolkitPackageSummary | null>(null);

    return (
        <div className={twMerge('flex max-h-full min-h-0 flex-col', className)}>
            <VirtualTable
                columns={dataColumns}
                data={data}
                getRowId={(row) => row.package_name}
                isLoading={isLoading}
                error={error}
                isRetrying={isRefetching}
                retryLabel="Reload"
                emptyTitle="No packages found"
                emptyMessage="Try adjusting filters and check!"
                onRetry={onRefetch}
                enableSorting={false}
                onRowClick={(row) => setUpdatingPackage(row)}
                initialSorting={[{ id: 'package_name', desc: false }]}
                classNames={{
                    tbodyCell: 'py-1.5 text-[0.6rem] 2xl:text-xs',
                    theadCell: 'py-1 text-xs font-semibold bg-(--brand-color) text-(--brand-text-inverse) 2xl:text-xs',
                    filterCell: 'text-[0.7rem]',
                    toolbar: 'pb-2 pt-1 px-1.5',
                    theadRow: 'bg-white ',
                    thead: 'bg-white',
                    tableWrapper: 'h-auto max-h-full rounded-none overflow-auto border-none',
                    root: 'rounded-none shadow-none p-0 rounded-lg',
                    sortIcon: 'text-(--brand-title-primary-color) text-xs',
                }}
            >
                <VirtualTable.Content />
            </VirtualTable>

            {/* Update Package Config Modal */}
            <FormActionModal
                key={updatingPackage ? `Update-${updatingPackage.package_name}` : 'update-package-modal'}
                open={!!updatingPackage}
                onClose={() => setUpdatingPackage(null)}
                title="Update Package Configuration"
                formSize="2xl"
                successSize="md"
                successConfig={{ title: 'Package configuration updated successfully' }}
            >
                {({ onSuccess, setOverlay, setCanClose }) => (
                    <UpdateToolkitPackageConfigForm
                        mode="update"
                        setOverlay={setOverlay}
                        setCanClose={setCanClose}
                        initialValues={{
                            package_name: updatingPackage?.package_name,
                            llm_tag: updatingPackage?.llm_tag,
                            itsm_tags: updatingPackage?.itsm_tags,
                            llm_guards: updatingPackage?.llm_guards,
                        }}
                        isFieldDisabled={(field) => ['package_name'].includes(field.fieldName)}
                        onSubmitSuccess={async (response) => {
                            logger.debug('Package config updated successfully:', response);
                            onSuccess({ successMessage: response.message });
                            onRefetch();
                        }}
                    />
                )}
            </FormActionModal>
        </div>
    );
};

export default ToolkitPackagesTable;

const dataColumns: VirtualTableColumnDef<ToolkitPackageSummary>[] = [
    {
        id: 'package_name',
        accessorKey: 'package_name',
        header: 'Package Name',
        size: 180,
        minSize: 180,
        maxSize: 200,
        enableGlobalFilter: true,
        cell: ({ getValue, column }) => {
            const value = getValue() as string;
            return (
                <div className="flex items-start gap-2 min-w-0">
                    <span className="size-2 shrink-0 rounded-full mt-2 bg-(--brand-color)" />
                    <CopyText text={value} className="flex-1 min-w-0" textClassName="text-xs font-semibold text-(--brand-title-primary-color)">
                        {({ text }) => (
                            <span className="text-xs font-semibold break-all text-(--brand-title-primary-color)">
                                <HighlightedText text={text} columnId={column.id} highlightGlobal />
                            </span>
                        )}
                    </CopyText>
                </div>
            );
        },
    },
    {
        id: 'llm_tag',
        accessorKey: 'llm_tag',
        header: 'LLM Tag',
        size: 160,
        minSize: 150,
        maxSize: 220,
        enableGlobalFilter: true,
        cell: ({ getValue, column }) => {
            const value = getValue() as string | undefined;
            if (!value) return <span className="text-xs text-muted-foreground italic">-</span>;
            return (
                <span className="inline-flex items-center gap-1.5 text-[0.7rem] break-all font-medium px-2.5 py-0.5 rounded-full bg-(--brand-text-inverse)/5 text-(--brand-color) border border-(--brand-color)">
                    <span className="size-1.5 rounded-full bg-(--brand-color) mt-0.5" />
                    <HighlightedText text={value} columnId={column.id} highlightGlobal />
                </span>
            );
        },
    },
    {
        id: 'llm_guards',
        accessorKey: 'llm_guards',
        header: 'LLM Guards',
        minSize: 180,
        maxSize: 400,
        enableGlobalFilter: true,
        cell: ({ getValue, column }) => {
            const guards = getValue() as string[] | undefined;
            if (!guards?.length) return <span className="text-xs text-muted-foreground italic">-</span>;
            return (
                <div className="flex flex-wrap gap-1">
                    {guards.map((guard) => (
                        <span
                            key={guard}
                            className="inline-flex items-center text-[0.6rem] font-medium px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200"
                        >
                            <HighlightedText text={guard} columnId={column.id} highlightGlobal />
                        </span>
                    ))}
                </div>
            );
        },
    },
    {
        id: 'itsm_tags',
        accessorKey: 'itsm_tags',
        header: 'ITSM Tags',
        minSize: 180,
        maxSize: 400,
        enableGlobalFilter: true,
        cell: ({ getValue, column }) => {
            const tags = getValue() as string[] | undefined;
            if (!tags?.length) return <span className="text-xs text-muted-foreground italic">-</span>;
            return (
                <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                        <span
                            key={tag}
                            className="inline-flex items-center text-[0.6rem] font-medium px-2 py-0.5 rounded-md bg-(--brand-text-inverse)/5 text-(--brand-color) border border-(--brand-color)"
                        >
                            <HighlightedText text={tag} columnId={column.id} highlightGlobal />
                        </span>
                    ))}
                </div>
            );
        },
    },
];
