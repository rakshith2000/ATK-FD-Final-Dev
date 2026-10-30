import { HighlightedText, VirtualTable, type VirtualTableColumnDef } from '@/shared/modules/virtual-table';
import React, { useMemo, useState } from 'react';
import type { PackageConfiguration, PromptConfiguration } from '@/modules/admin-portal/modules/prompt-library/types/prompt-library';
import { twMerge } from 'tailwind-merge';
import CopyText from '@/shared/components/ui/CopyText/CopyText';
import logger from '@/shared/utils/logger';
import FormActionModal from '@/shared/components/ui/FormActionModal/FormActionModal';
import UpdatePromptConfigForm from '../UpdatePromptConfigForm/UpdatePromptConfigForm';
import type { ToolkitPackageSummary } from '../ToolkitPackagesTable/ToolkitPackagesTable';
import ToolkitPackagesTable from '../ToolkitPackagesTable/ToolkitPackagesTable';
import RefetchButton from '@/shared/components/ui/RefetchButton/RefetchButton';

interface PromptConfigurationWithIdentifier extends PromptConfiguration {
    identifier: string;
}

interface PromptConfigurationsTableProps {
    className?: string;
    packageName: string;
    packageConfiguration?: PackageConfiguration;
    prompts?: Record<string, PromptConfiguration>;
    isLoading: boolean;
    error: Error | null;
    isRefetching: boolean;
    onRefetch: () => void;
}

const PromptConfigurationsTable: React.FC<PromptConfigurationsTableProps> = ({
    className,
    packageName,
    packageConfiguration,
    prompts,
    error,
    isLoading,
    isRefetching,
    onRefetch,
}) => {
    const [updatingPromptConfig, setUpdatingPromptConfig] = useState<PromptConfigurationWithIdentifier | null>(null);

    const promptsDataList: Array<PromptConfigurationWithIdentifier> = useMemo(() => {
        if (prompts) {
            return Object.entries(prompts).map(([key, value]) => ({
                identifier: key,
                description: value.description,
                instruction: value.instruction,
                llm_tag: value.llm_tag,
                itsm_tags: value.itsm_tags ?? [],
            }));
        }
        return [];
    }, [prompts]);

    const getToolkitPackages: () => Array<ToolkitPackageSummary> = () => {
        if (!packageConfiguration) {
            return [];
        }
        const toolkitPackagesList: Array<ToolkitPackageSummary> = [];

        const toolkitPackage: ToolkitPackageSummary = {
            package_name: packageName,
            itsm_tags: packageConfiguration?.itsm_tags,
            llm_guards: packageConfiguration?.llm_guards,
            llm_tag: packageConfiguration?.llm_tag,
        };

        toolkitPackagesList.push(toolkitPackage);

        return toolkitPackagesList;
    };

    return (
        <div className={twMerge('flex max-h-full min-h-0 flex-col', className)}>
            <VirtualTable
                columns={dataColumns}
                data={promptsDataList}
                getRowId={(row) => row.identifier}
                isLoading={isLoading}
                error={error}
                isRetrying={isRefetching}
                retryLabel="Reload"
                emptyTitle="No Prompts found"
                emptyMessage="Try adjusting filters and check!"
                onRetry={onRefetch}
                enableSorting={false}
                onRowClick={(row) => {
                    setUpdatingPromptConfig(row);
                }}
                classNames={{
                    tbodyCell: 'py-1.5 text-[0.65rem] 2xl:text-xs',
                    theadCell: 'py-1 text-[0.7rem] font-semibold bg-blue-50 text-(--brand-title-primary-color) 2xl:text-xs',
                    filterCell: 'text-[0.7rem]',
                    toolbar: 'pb-2 pt-1 px-1.5',
                    theadRow: 'bg-white',
                    thead: 'bg-white',
                    tableWrapper: 'h-auto max-h-full rounded overflow-auto',
                    sortIcon: 'text-(--brand-title-primary-color) text-xs',
                }}
            >
                <ToolkitPackagesTable
                    className="min-h-min p-0.5"
                    data={getToolkitPackages()}
                    error={error}
                    isLoading={isLoading}
                    isRefetching={isRefetching}
                    onRefetch={onRefetch}
                    key={packageName}
                />
                <VirtualTable.Toolbar className="text-sm p-0 border-none">
                    <div className="flex flex-wrap justify-end items-center w-full gap-3 border-none px-1 py-1.5">
                        <div className="flex flex-row items-center justify-center gap-1 text-(--brand-text-inverse) bg-(--brand-color) py-1 px-4 rounded-2xl">
                            <h1 className="text-xs font-semibold tracking-wider min-w-fit">Prompt Configurations</h1>
                        </div>

                        <div className="flex-1" />
                        <VirtualTable.RowInfo
                            className="bg-(--brand-color) shadow-[0_0px_1px_0px_var(--brand-text-inverse)] text-(--brand-text-inverse) py-1 px-3 rounded-full"
                            rowsAlias=" Prompts"
                        />
                        <VirtualTable.GlobalSearch
                            placeholder="Search prompts..."
                            className="bg-(--brand-color) shadow-[0_0px_1px_0px_var(--brand-text-inverse)] text-(--brand-text-inverse) py-0 px-3 rounded-full"
                            childrenClassNames={{
                                clearIcon: 'text-inherit hover:text-inherit',
                                searchIcon: 'text-inherit',
                                input: 'text-inherit bg-transprent border-none placeholder:text-(--brand-text-inverse)/40 focus:ring-0',
                            }}
                        />
                        <VirtualTable.ColumnConfig
                            triggerClassName={twMerge(
                                'bg-(--brand-color)',
                                'shadow-[0_0px_1px_0px_var(--brand-text-inverse)]',
                                'text-(--brand-text-inverse)',
                                'border-none',
                                'py-1 px-3',
                                'rounded-full',
                                'hover:bg-(--brand-color)',
                                'hover:text-(--brand-text-inverse)',
                                'focus:ring-0',
                            )}
                        />
                        <RefetchButton isRefetching={isRefetching} onRefetch={onRefetch} iconSize={18} className="text-(--brand-color)" />
                    </div>
                </VirtualTable.Toolbar>
                <VirtualTable.Content className="m-0.5 border border-(--brand-border-color)" />
            </VirtualTable>

            {/* Update Prompt Config */}
            <FormActionModal
                key={updatingPromptConfig ? `Update-${updatingPromptConfig.identifier}` : 'update-prompt-config-modal'}
                open={!!updatingPromptConfig}
                onClose={() => setUpdatingPromptConfig(null)}
                title="Update Prompt Config"
                formSize="2xl"
                successSize="md"
                successConfig={{ title: 'Prompt config updated successfully' }}
            >
                {({ onSuccess, setOverlay, setCanClose }) => (
                    <UpdatePromptConfigForm
                        mode="update"
                        setOverlay={setOverlay}
                        setCanClose={setCanClose}
                        initialValues={{
                            package_name: packageName,
                            agent_or_tool_name: updatingPromptConfig?.identifier,
                            description: updatingPromptConfig?.description,
                            instruction: updatingPromptConfig?.instruction,
                            llm_tag: updatingPromptConfig?.llm_tag,
                            itsm_tags: updatingPromptConfig?.itsm_tags,
                        }}
                        isFieldDisabled={(field) => ['package_name', 'agent_or_tool_name'].includes(field.fieldName)}
                        onSubmitSuccess={async (response) => {
                            logger.debug('Prompt config updated successfully with response:', response);
                            onSuccess({ successMessage: response.message });
                            onRefetch();
                            logger.debug({ response });
                        }}
                    />
                )}
            </FormActionModal>
        </div>
    );
};

export default PromptConfigurationsTable;

const dataColumns: VirtualTableColumnDef<PromptConfigurationWithIdentifier>[] = [
    {
        id: 'identifier',
        accessorFn: (row) => row.identifier,
        header: 'Prompt Identifier',
        size: 280,
        minSize: 280,
        maxSize: 400,
        cell: ({ getValue, column }) => {
            const value = getValue() as string;
            return (
                <div className="flex items-start gap-2 min-w-0">
                    <span className={twMerge('size-2 shrink-0 rounded-full mt-2 bg-(--brand-color)')} />

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
        id: 'description',
        accessorKey: 'description',
        header: 'Description',
        minSize: 400,
        maxSize: 800,
        cell: ({ getValue, column }) => {
            const value = getValue() as string;
            return (
                <p className="text-[0.7rem] leading-relaxed line-clamp-5 wrap-break-word min-w-0">
                    <HighlightedText text={value} columnId={column.id} highlightGlobal />
                </p>
            );
        },
    },
    {
        id: 'llm_tag',
        accessorKey: 'llm_tag',
        header: 'LLM Tag',
        size: 150,
        minSize: 150,
        maxSize: 200,
        meta: { canEdit: true },
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
        id: 'itsm_tags',
        accessorKey: 'itsm_tags',
        header: 'ITSM Tags',
        minSize: 130,
        maxSize: 400,
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
    {
        id: 'instruction',
        accessorKey: 'instruction',
        header: 'Instruction',
        minSize: 400,
        maxSize: 800,
        cell: ({ getValue, column }) => {
            const value = getValue() as string;
            return (
                <p className="text-[0.7rem] leading-relaxed line-clamp-3 wrap-break-word min-w-0 whitespace-pre-wrap">
                    {value ? <HighlightedText text={value} columnId={column.id} highlightGlobal /> : <span className="text-xs text-muted-foreground italic">-</span>}
                </p>
            );
        },
    },
];
