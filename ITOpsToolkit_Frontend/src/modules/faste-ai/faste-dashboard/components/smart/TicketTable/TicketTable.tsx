import React, { useMemo, useState, useCallback } from 'react';
import { Eye } from 'lucide-react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { isFlagTrue } from '@/modules/faste-ai/faste-dashboard/typeguard/fasteai-type-guards';
import { VirtualTable, type VirtualTableColumnDef } from '@/shared/modules/virtual-table';
import { SelectInput, type SelectOption } from '@/shared/components/ui/InputFields';
import { openSnowTicket } from '@/modules/faste-ai/faste-dashboard/utils/snowTicketHelper';
import { fasteaiFetch, FASTEAI_CORE_BASE } from '@/api/axios-clients/fasteai/fasteaiAuth';
import { FasteLogModal, type LogItem } from '../FasteLogModal/FasteLogModal';
import { TicketSnapshotModal } from '../TicketSnapshotModal/TicketSnapshotModal';

export interface Ticket {
    number: string;
    dashboard_category?: string;
    ticket_category?: string;
    short_description?: string;
    resolved: boolean | string;
    escalation_state: boolean | string;
}

interface TicketTableProps {
    filteredTickets: Ticket[];
    filterStatus: string;
    setFilterStatus: (status: string) => void;
    isLoading?: boolean;
}

interface TitleWithArraowProps {
    title: string;
    className?: ClassNameValue;
    showArrow?: boolean;
}

const TitleWithArraow: React.FC<TitleWithArraowProps> = ({ title, className, showArrow = true }) => {
    return (
        <div className={twMerge('text-xs text(--ticket-title-color) font-bold inline-flex flex-col', className)}>
            <span>{title}</span>
            <div className="relative w-full">
                <hr className="m-0 border border-(--change-arrow-color-itsm) opacity-100" />
                {showArrow ? (
                    <div
                        className="absolute right-0 top-px w-0 h-0"
                        style={{
                            borderLeft: '4px solid transparent',
                            borderRight: '4px solid transparent',
                            borderTop: '6px solid var(--change-arrow-color-itsm)',
                        }}
                    />
                ) : null}
            </div>
        </div>
    );
};

export const TicketTable: React.FC<TicketTableProps> = ({ filteredTickets, filterStatus, setFilterStatus, isLoading = false }) => {
    const [logModalOpen, setLogModalOpen] = useState(false);
    const [logModalTicket, setLogModalTicket] = useState<string | null>(null);
    const [fetchedLogs, setFetchedLogs] = useState<LogItem[]>([]);
    const [logsFetching, setLogsFetching] = useState(false);
    const [logsErrored, setLogsErrored] = useState(false);
    const [snapshotTicket, setSnapshotTicket] = useState<Ticket | null>(null);

    const handleViewLogs = useCallback(async (ticketNumber: string) => {
        setLogModalTicket(ticketNumber);
        setFetchedLogs([]);
        setLogsErrored(false);
        setLogsFetching(true);
        try {
            const response = await fasteaiFetch(`${FASTEAI_CORE_BASE}/current-tasks/${ticketNumber}/logs`, FASTEAI_CORE_BASE);
            if (response.status >= 200 && response.status < 300) {
                const data: unknown = response.data;
                const rawLogs = Array.isArray(data)
                    ? data
                    : typeof data === 'object' && data !== null && Array.isArray((data as Record<string, unknown>).logs)
                      ? ((data as Record<string, unknown>).logs as unknown[])
                      : [];
                setFetchedLogs(rawLogs as LogItem[]);
            } else {
                setLogsErrored(true);
            }
        } catch {
            setLogsErrored(true);
        } finally {
            setLogsFetching(false);
            setLogModalOpen(true);
        }
    }, []);

    const handleDownloadLogs = useCallback(
        (id: string) => {
            const logText = fetchedLogs.map((l) => `[${l.source ?? 'Agent'}] ${l.message ?? ''}`).join('\n\n');
            const blob = new Blob([logText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${id}_operation_logs.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        [fetchedLogs],
    );

    const statusOptions: SelectOption[] = useMemo(
        () => [
            { label: 'All Status', value: 'all' },
            { label: 'Resolved', value: 'resolved' },
            { label: 'Active', value: 'active' },
            { label: 'Escalated', value: 'escalated' },
        ],
        [],
    );

    const statusFilteredData = useMemo(() => {
        if (filterStatus === 'all') return filteredTickets;
        return filteredTickets.filter((ticket) => {
            const isResolved = isFlagTrue(ticket.resolved);
            const isEscalated = isFlagTrue(ticket.escalation_state);

            if (filterStatus === 'resolved') return isResolved;
            if (filterStatus === 'active') return !isResolved;
            if (filterStatus === 'escalated') return isEscalated;
            return true;
        });
    }, [filteredTickets, filterStatus]);

    const columns = useMemo<VirtualTableColumnDef<Ticket>[]>(
        () => [
            {
                id: 'number',
                accessorKey: 'number',
                header: 'Number',
                size: 120,
                minSize: 90,
                maxSize: 150,
                cell: ({ getValue }) => {
                    const ticketNumber = getValue<string>();
                    return (
                        <button
                            type="button"
                            onClick={() => {
                                openSnowTicket(ticketNumber);
                            }}
                            title="Open in ServiceNow"
                            style={{ color: 'rgb(29, 111, 219)' }}
                            className="font-bold underline cursor-pointer truncate block w-full text-center text-xs transition-colors bg-transparent border-0 p-0"
                        >
                            {ticketNumber}
                        </button>
                    );
                },
            },
            {
                id: 'dashboard_category',
                accessorKey: 'dashboard_category',
                header: 'Tower',
                size: 120,
                minSize: 90,
                maxSize: 150,
                cell: ({ getValue }) => <span className="text-gray-600 truncate block text-center text-xs">{getValue<string>() || 'Total Tickets'}</span>,
            },
            {
                id: 'ticket_category',
                accessorKey: 'ticket_category',
                header: 'Category',
                size: 140,
                minSize: 110,
                maxSize: 170,
                cell: ({ getValue }) => <span className="truncate max-w-35 block text-center text-xs">{getValue<string>() || 'General'}</span>,
            },
            {
                id: 'short_description',
                accessorKey: 'short_description',
                header: 'Description',
                size: 260,
                minSize: 180,
                cell: ({ getValue }) => (
                    <span className="text-left truncate block font-normal text-gray-500 text-xs" title={getValue<string>()}>
                        {getValue<string>()}
                    </span>
                ),
            },
            {
                id: 'resolved',
                accessorKey: 'resolved',
                header: 'Status',
                size: 90,
                minSize: 75,
                maxSize: 110,
                cell: ({ getValue }) => {
                    const resolved = isFlagTrue(getValue<boolean | string>());
                    return <span className={`font-bold text-xs ${resolved ? 'text-green-600' : 'text-[#3B62CC]'}`}>{resolved ? 'Resolved' : 'Active'}</span>;
                },
            },
            {
                id: 'escalation_state',
                accessorKey: 'escalation_state',
                header: 'Escalation',
                size: 90,
                minSize: 75,
                maxSize: 110,
                cell: ({ getValue }) => <span className="font-normal text-xs">{isFlagTrue(getValue<boolean | string>()) ? 'Yes' : 'No'}</span>,
            },
            {
                id: 'details',
                header: 'Details',
                size: 90,
                minSize: 80,
                maxSize: 110,
                enableSorting: false,
                cell: ({ row }) => (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSnapshotTicket(row.original);
                        }}
                        title="View ticket snapshot"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#011A80] text-white border border-[#011A80] hover:opacity-90 transition-opacity cursor-pointer"
                    >
                        <Eye className="w-3 h-3" />
                        Details
                    </button>
                ),
            },
        ],
        [],
    );

    return (
        <>
            <TicketSnapshotModal
                isOpen={snapshotTicket !== null}
                ticket={snapshotTicket ? { ...snapshotTicket } : null}
                onClose={() => setSnapshotTicket(null)}
                onViewLogs={(ticketNumber) => {
                    setSnapshotTicket(null);
                    void handleViewLogs(ticketNumber);
                }}
            />
            {logModalTicket && (
                <FasteLogModal
                    isOpen={logModalOpen}
                    onClose={() => {
                        setLogModalOpen(false);
                        setLogModalTicket(null);
                    }}
                    incidentId={logModalTicket}
                    logs={fetchedLogs}
                    isDisconnected={!logsFetching && logsErrored}
                    onDownload={handleDownloadLogs}
                />
            )}
            <div className="w-full flex flex-col mb-5">
                <div className="bg-white rounded-xl border border-blue-200 overflow-hidden shadow-xs p-0 flex flex-col">
                    <div className="h-105 w-full">
                        <VirtualTable
                            data={statusFilteredData}
                            columns={columns}
                            getRowId={(row, index) => `${row.number}-${index}`}
                            enableSorting={true}
                            enableColumnFilters={false}
                            enableGlobalFilter={true}
                            isLoading={isLoading}
                            emptyTitle="No records found"
                            emptyMessage="Try adjusting filters and check !"
                            classNames={{
                                tbodyCell: 'text-xs py-2 text-center border-b border-gray-200 text-gray-600',
                                theadCell: 'text-xs font-semibold py-2 bg-[#C1E1FF] text-[#0A369D] text-center border-r border-blue-200',
                                toolbar: 'py-2 px-3 flex items-center justify-between gap-3 border-b border-blue-100',
                                theadRow: 'bg-[#C1E1FF]',
                                thead: 'bg-[#C1E1FF]',
                            }}
                        >
                            <VirtualTable.Toolbar>
                                <TitleWithArraow
                                    title="Ticket Details"
                                    showArrow={true}
                                    className="p-0 text-base font-bold pb-0.5 tracking-tight text-[#0A369D] [--ticket-title-color:#0A369D] [--change-arrow-color-itsm:#0A369D]"
                                />
                                <div className="flex-1" />
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-gray-500 bg-blue-50/70 border border-blue-100 px-2 py-0.5 rounded-md">
                                        <strong>{statusFilteredData.length}</strong> rows
                                    </span>

                                    <VirtualTable.GlobalSearch placeholder="Search Number..." />
                                    <div className="w-36">
                                        <SelectInput
                                            options={statusOptions}
                                            value={filterStatus}
                                            clearable={false}
                                            onChange={(val) => setFilterStatus(val as string)}
                                            triggerClassName="rounded-lg py-1 px-2.5 shadow-xs bg-white h-[26px] text-xs text-gray-700 border-gray-300"
                                        />
                                    </div>
                                    <VirtualTable.ColumnConfig />
                                </div>
                            </VirtualTable.Toolbar>
                            <VirtualTable.Content className="rounded-none" />
                        </VirtualTable>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TicketTable;
