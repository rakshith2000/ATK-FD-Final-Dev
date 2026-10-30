import { useRef, useState, useMemo } from 'react';
import { useSnowAttachmentsQuery } from '../../hooks/useSnowAttachmentsQuery';
import { useUploadSnowAttachmentMutation } from '../../hooks/useUploadSnowAttachmentMutation';
import { useDownloadSnowAttachmentMutation } from '../../hooks/useDownloadSnowAttachmentMutation';
import type { SnowNormalizedAttachment } from '../../types/attachment';
import { HighlightedText, VirtualTable, type VirtualTableColumnDef, dateSortFn } from '@/shared/modules/virtual-table';
import { Upload, Download, RotateCw, Loader2, FileText, FileImage, FileSpreadsheet, FileArchive, FileCode, File } from 'lucide-react';
import CopyText from '@/shared/components/ui/CopyText/CopyText';
import SnowTicketDateTimeCell from '@/shared/components/ui/VirtualTableCells/SnowTicketDateTimeCell';
import { EmptyPlaceholder, ErrorPlaceholder, LoadingPlaceholder } from '@/shared/components/ui/Placeholders';
import type { SnowTableName } from '../../types/ticket';

interface SnowAttachmentManagerProps {
    tableName: SnowTableName;
    tableSysId: string;
    title?: string;
    className?: string;
}

function formatBytes(bytes: number, decimals = 1): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFileIcon(ext: string, contentType: string) {
    if (['pdf'].includes(ext) || contentType.includes('pdf')) return FileText;
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext) || contentType.includes('image')) return FileImage;
    if (['xlsx', 'xls', 'csv'].includes(ext) || contentType.includes('excel') || contentType.includes('spreadsheet')) return FileSpreadsheet;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || contentType.includes('zip') || contentType.includes('compressed')) return FileArchive;
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py'].includes(ext) || contentType.includes('json') || contentType.includes('javascript')) return FileCode;
    return File;
}

export const SnowAttachmentManager = ({ tableName, tableSysId, className = '' }: SnowAttachmentManagerProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [downloadingSysId, setDownloadingSysId] = useState<string | null>(null);

    const attachmentsQuery = useSnowAttachmentsQuery({ tableName, tableSysId });
    const uploadMutation = useUploadSnowAttachmentMutation();
    const downloadMutation = useDownloadSnowAttachmentMutation({
        onSettled: () => setDownloadingSysId(null),
    });

    const handleUploadClick = () => {
        if (uploadMutation.isPending) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const selectedFile = files[0];
            uploadMutation.mutate({ tableName, tableSysId, file: selectedFile });
            e.target.value = '';
        }
    };

    const handleDownload = (row: SnowNormalizedAttachment) => {
        setDownloadingSysId(row.sys_id);
        downloadMutation.mutate({
            attachmentSysId: row.sys_id,
            fileName: row.file_name,
        });
    };

    const columns: VirtualTableColumnDef<SnowNormalizedAttachment>[] = useMemo(
        () => [
            {
                id: 'file_name',
                accessorFn: (row) => row.file_name,
                header: 'File Name',
                size: 260,
                minSize: 180,
                maxSize: 420,
                cell: ({ row, column }) => {
                    const fileName = row.original.file_name;
                    const ext = fileName.split('.').pop()?.toLowerCase() || '';
                    const IconComponent = getFileIcon(ext, row.original.content_type);

                    return (
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0 shadow-2xs">
                                <IconComponent size={14} />
                            </div>
                            <CopyText text={fileName} className="flex-1 min-w-0" textClassName="text-[0.75rem] font-semibold text-slate-800">
                                {({ text }) => (
                                    <span className="text-[0.75rem] font-semibold truncate text-slate-800 hover:text-blue-600 cursor-pointer transition-colors" title={fileName}>
                                        <HighlightedText text={text} columnId={column.id} highlightGlobal />
                                    </span>
                                )}
                            </CopyText>
                        </div>
                    );
                },
            },
            {
                id: 'size_bytes',
                accessorFn: (row) => row.size_bytes,
                header: 'Size',
                size: 100,
                minSize: 80,
                maxSize: 120,
                cell: ({ getValue }) => {
                    const bytes = getValue() as number;
                    return <span className="text-[0.75rem] font-semibold text-slate-600">{formatBytes(bytes)}</span>;
                },
            },
            {
                id: 'sys_created_on',
                accessorFn: (row) => row.sys_created_on,
                header: 'Uploaded On',
                size: 150,
                minSize: 120,
                maxSize: 180,
                sortingFn: dateSortFn,
                cell: SnowTicketDateTimeCell,
            },
            {
                id: 'sys_created_by',
                accessorFn: (row) => row.sys_created_by,
                header: 'Uploaded By',
                size: 130,
                minSize: 100,
                maxSize: 160,
                cell: ({ getValue }) => {
                    const author = getValue() as string;
                    return (
                        <span className="text-[0.75rem] font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60 inline-block truncate max-w-full">
                            {author || 'System'}
                        </span>
                    );
                },
            },
            {
                id: 'actions',
                accessorFn: (row) => row.sys_id,
                header: 'Action',
                size: 120,
                minSize: 120,
                maxSize: 120,
                enableSorting: false,
                cell: ({ row }) => {
                    const isItemDownloading = downloadingSysId === row.original.sys_id;

                    return (
                        <button
                            onClick={() => handleDownload(row.original)}
                            disabled={isItemDownloading}
                            className="px-2.5 py-1 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-[0.75rem] font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98] disabled:opacity-60 focus:outline-none"
                            title="Download Attachment"
                        >
                            {isItemDownloading ? (
                                <Loader2 size={12} className="animate-spin text-blue-600 shrink-0" />
                            ) : (
                                <Download size={12} className="text-slate-500 group-hover:text-blue-600 transition-colors shrink-0" />
                            )}
                            <span>{isItemDownloading ? 'Saving...' : 'Download'}</span>
                        </button>
                    );
                },
            },
        ],
        [downloadingSysId],
    );

    const attachmentList = attachmentsQuery.data ?? [];

    return (
        <div className={`w-full flex flex-col bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden ${className}`}>
            {/* Table Container - Horizontal scroll for mobile/tablet viewports */}
            <div className="flex-1 min-h-80 p-1 bg-slate-50/30 relative overflow-x-auto">
                {attachmentsQuery.isLoading ? (
                    <LoadingPlaceholder message="Fetching attachments from ServiceNow..." />
                ) : attachmentsQuery.isError ? (
                    <ErrorPlaceholder iconSize={200} error={attachmentsQuery.error} onRetry={() => attachmentsQuery.refetch()} isRefetching={attachmentsQuery.isRefetching} />
                ) : attachmentList.length === 0 ? (
                    <div className="w-full h-72 flex flex-col items-center justify-center gap-3 text-slate-400 bg-white/60 rounded-xl border border-dashed border-slate-200 p-6">
                        <EmptyPlaceholder
                            message="No Attachemnts found for the selected ticket !"
                            onRetry={attachmentsQuery?.refetch}
                            isRefetching={attachmentsQuery?.isRefetching}
                        />
                    </div>
                ) : (
                    <div className="flex max-h-[65dvh] h-120 min-h-0 flex-col">
                        <VirtualTable
                            data={attachmentList}
                            columns={columns}
                            enableColumnFilters={false}
                            enableGlobalFilter={true}
                            enableSorting={true}
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
                            <VirtualTable.Toolbar className="flex justify-between">
                                <div className="flex items-center gap-2 shrink-0">
                                    <VirtualTable.GlobalSearch placeholder="Search attachments..." />
                                    <VirtualTable.RowInfo />
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Refetch Button */}
                                    <button
                                        onClick={() => attachmentsQuery.refetch()}
                                        disabled={attachmentsQuery.isFetching}
                                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-2xs focus:outline-none disabled:opacity-50"
                                        title="Refetch Attachments"
                                    >
                                        <RotateCw size={14} className={attachmentsQuery.isFetching ? 'animate-spin text-blue-600' : ''} />
                                    </button>

                                    {/* Hidden File Input */}
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                                    {/* Upload Button */}
                                    <button
                                        onClick={handleUploadClick}
                                        disabled={uploadMutation.isPending}
                                        className="px-3 py-1 rounded-lg btn-split split-blue-light active:scale-[0.98] text-white text-[0.75rem] font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-xs focus:outline-none disabled:opacity-60"
                                        title="Upload New Attachment to ServiceNow"
                                    >
                                        <span className="flex gap-3 justify-center items-center">
                                            {uploadMutation.isPending ? <Loader2 size={14} className="animate-spin shrink-0" /> : <Upload size={14} className="shrink-0" />}
                                            <span>{uploadMutation.isPending ? 'Uploading...' : 'Upload Attachment'}</span>
                                        </span>
                                    </button>
                                </div>
                            </VirtualTable.Toolbar>
                            <VirtualTable.Content />
                        </VirtualTable>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SnowAttachmentManager;
