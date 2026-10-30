import { useState, useCallback, useMemo, useRef } from 'react';
import { Eye, Pencil, Trash2, ChevronDown, ChevronUp, Check, X, Save, Plus } from 'lucide-react';
import type { Row } from '@tanstack/react-table';
import {
    VirtualTable,
    type VirtualTableColumnDef,
    type FilterOption,
    type FilterOptionsArgs,
    type CustomFilterComponentProps,
    type EditCellProps,
    dateSortFn,
    prioritySortFn,
} from '@/shared/modules/virtual-table';
import { TextInput, SelectInput } from '@/shared/components/ui/InputFields';
import type { SnowTicket, SnowTicketField } from '@/shared/modules/servicenow/types/ticket';
import Modal from '@/shared/components/ui/Modal/Modal';
import logger from '@/shared/utils/logger';

//  Helpers

/** Safely read display_value from a SnowTicketField, falling back to value or '' */
const dv = (field: SnowTicketField | undefined): string => field?.display_value ?? field?.value ?? '';

/** Create a SnowTicketField shorthand */
const f = (display_value: string, value?: string): SnowTicketField => ({
    display_value,
    value: value ?? display_value,
});

//  Mock Data

const ASSIGNEES = ['Beth Anglin', 'Charlie Whitherspoon', 'David Loo', 'Fred Luddy', 'Howard Johnson', 'Bud Richman', 'Luke Wilson', 'ITIL User'];
const ASSIGNMENT_GROUPS = ['Service Desk', 'CAB Approval', 'Network', 'Hardware', 'Software', 'Database', 'Cloud Ops', 'Security Ops'];
const CATEGORIES = ['Network', 'Hardware', 'Software', 'Inquiry / Help', 'Database', 'Security', 'Cloud', 'Monitoring'];
const PRIORITIES = [
    { display: '1 - Critical', value: '1' },
    { display: '2 - High', value: '2' },
    { display: '3 - Moderate', value: '3' },
    { display: '4 - Low', value: '4' },
];
const STATES = [
    { display: 'New', value: '1' },
    { display: 'In Progress', value: '2' },
    { display: 'On Hold', value: '3' },
    { display: 'Resolved', value: '6' },
    { display: 'Closed', value: '7' },
];
const SEVERITIES = [
    { display: '1 - High', value: '1' },
    { display: '2 - Medium', value: '2' },
    { display: '3 - Low', value: '3' },
];
const IMPACTS = [
    { display: '1 - High', value: '1' },
    { display: '2 - Medium', value: '2' },
    { display: '3 - Low', value: '3' },
];
const URGENCIES = [
    { display: '1 - High', value: '1' },
    { display: '2 - Medium', value: '2' },
    { display: '3 - Low', value: '3' },
];
const TAGS = [
    'network',
    'vpn',
    'email',
    'hardware',
    'software',
    'firewall',
    'dns',
    'ssl',
    'backup',
    'kubernetes',
    'cloud',
    'monitoring',
    'security',
    'database',
    'performance',
    'outage',
    'urgent',
    'maintenance',
];

const DESCRIPTIONS = [
    'Unable to access email',
    'Wireless access is down in various different areas',
    "Can't read email",
    'VPN connection drops intermittently',
    'Disk space running low on DB server',
    'SSL certificate expiring next week',
    'Firewall rule update for new service',
    'CPU usage spike on app cluster',
    'Backup job failing since last patch',
    'Kubernetes pod crash-looping',
    'DNS resolution failure for internal apps',
    'Load balancer health check failing',
    'Azure AD sync issues with on-prem',
    'Jenkins pipeline broken after upgrade',
    'Grafana dashboard not loading metrics',
];

function generateSnowTickets(count: number): SnowTicket[] {
    return Array.from({ length: count }, (_, i) => {
        const priority = PRIORITIES[i % PRIORITIES.length];
        const state = STATES[i % STATES.length];
        const severity = SEVERITIES[i % SEVERITIES.length];
        const impact = IMPACTS[i % IMPACTS.length];
        const urgency = URGENCIES[i % URGENCIES.length];
        const openedDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
        const createdDate = new Date(openedDate.getTime() - Math.random() * 60 * 60 * 1000);
        // Generate 1-4 random tags per ticket
        const tagCount = 1 + (i % 4);
        const ticketTags = Array.from({ length: tagCount }, (_, j) => TAGS[(i + j * 3) % TAGS.length]);
        const uniqueTags = [...new Set(ticketTags)].join(', ');

        return {
            sys_id: f(`sys_${String(i).padStart(6, '0')}`),
            number: f(`INC${String(100000 + i).padStart(7, '0')}`),
            short_description: f(DESCRIPTIONS[i % DESCRIPTIONS.length]),
            assigned_to: f(ASSIGNEES[i % ASSIGNEES.length]),
            assignment_group: f(ASSIGNMENT_GROUPS[i % ASSIGNMENT_GROUPS.length]),
            priority: f(priority.display, priority.value),
            state: f(state.display, state.value),
            category: f(CATEGORIES[i % CATEGORIES.length]),
            severity: f(severity.display, severity.value),
            impact: f(impact.display, impact.value),
            urgency: f(urgency.display, urgency.value),
            opened_at: f(openedDate.toISOString().slice(0, 10)),
            sys_created_on: f(createdDate.toISOString().replace('T', ' ').slice(0, 19)),
            sys_updated_on: f(new Date().toISOString().replace('T', ' ').slice(0, 19)),
            sla_due: f(Math.random() > 0.7 ? 'BREACH' : 'In progress'),
            tags: f(uniqueTags),
        } satisfies SnowTicket;
    });
}

//  Filter option derivers (functions that receive data)

const getCategoryOptions = ({ data }: FilterOptionsArgs): FilterOption[] => {
    const tickets = data as SnowTicket[];
    const unique = [...new Set(tickets.map((t) => dv(t.category)))].filter(Boolean).sort((a, b) => a.localeCompare(b));
    return unique.map((c) => ({ label: c, value: c }));
};

//  Simulated async option fetchers (mimic ServiceNow Table API)

/** Simulates a network call to fetch assignment group options with delay. */
const fetchAssignmentGroupOptions = (searchTerm: string): Promise<FilterOption[]> =>
    new Promise((resolve) => {
        setTimeout(() => {
            const all = ASSIGNMENT_GROUPS.map((g) => ({ label: g, value: g }));
            if (!searchTerm.trim()) {
                resolve(all);
                return;
            }
            const lower = searchTerm.toLowerCase();
            resolve(all.filter((o) => o.label.toLowerCase().includes(lower)));
        }, 800);
    });

/** Simulates a slower network call - demonstrates the loading spinner. */
const fetchAssigneeOptionsAsync = (searchTerm: string): Promise<FilterOption[]> =>
    new Promise((resolve) => {
        setTimeout(() => {
            const all = ASSIGNEES.map((a) => ({ label: a, value: a }));
            if (!searchTerm.trim()) {
                resolve(all);
                return;
            }
            const lower = searchTerm.toLowerCase();
            resolve(all.filter((o) => o.label.toLowerCase().includes(lower)));
        }, 1200);
    });

//  Custom Filter using Input.TextField (demonstrates filterComponent)

const CustomTextFilter = ({ value, onChange }: CustomFilterComponentProps<SnowTicket>) => (
    <TextInput value={(value as string) ?? ''} onChange={(val) => onChange(val || undefined)} placeholder="Custom filter..." />
);

//  Custom Editor using Input.SelectField (demonstrates editComponent)

const CustomSelectEditor = ({ value, onChange, onBlur }: EditCellProps<SnowTicket>) => (
    <SelectInput
        value={(value as string) ?? ''}
        onChange={(val) => {
            onChange(Array.isArray(val) ? (val[0] ?? '') : val);
            onBlur();
        }}
        onBlur={onBlur}
        options={CATEGORIES.map((c) => ({ label: c, value: c }))}
        placeholder="Pick category..."
    />
);

//  Sub-Component for Row Expansion

const TicketSubComponent = ({ row }: { row: Row<SnowTicket> }) => {
    const ticket = row.original;
    const table = row.getAllCells()[0]?.getContext().table;
    const updateData = table?.options.meta?.updateData;

    // Local state for sub-component editable fields
    const [notes, setNotes] = useState('');

    const handleNotesSubmit = () => {
        if (notes.trim() && updateData) {
            // Demonstrate updateData from sub-component
            updateData(row.id, 'work_notes', notes);
            setNotes('');
        }
    };

    return (
        <div className="border-t border-gray-200 bg-gray-50/50 px-6 py-4">
            <div className="grid grid-cols-3 gap-6">
                {/* Ticket Details */}
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ticket Details</h4>
                    <div className="space-y-1.5 text-xs">
                        <div className="flex gap-2">
                            <span className="w-24 shrink-0 font-medium text-gray-500">Number:</span>
                            <span className="text-gray-700">{dv(ticket.number)}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="w-24 shrink-0 font-medium text-gray-500">Created:</span>
                            <span className="text-gray-700">{dv(ticket.sys_created_on)}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="w-24 shrink-0 font-medium text-gray-500">Updated:</span>
                            <span className="text-gray-700">{dv(ticket.sys_updated_on)}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="w-24 shrink-0 font-medium text-gray-500">SLA:</span>
                            <span className={`font-medium ${dv(ticket.sla_due) === 'BREACH' ? 'text-red-600' : 'text-green-600'}`}>{dv(ticket.sla_due)}</span>
                        </div>
                    </div>
                </div>

                {/* Assignment Info */}
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Assignment</h4>
                    <div className="space-y-1.5 text-xs">
                        <div className="flex gap-2">
                            <span className="w-24 shrink-0 font-medium text-gray-500">Assigned To:</span>
                            <span className="text-gray-700">{dv(ticket.assigned_to)}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="w-24 shrink-0 font-medium text-gray-500">Group:</span>
                            <span className="text-gray-700">{dv(ticket.assignment_group)}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="w-24 shrink-0 font-medium text-gray-500">Category:</span>
                            <span className="text-gray-700">{dv(ticket.category)}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="w-24 shrink-0 font-medium text-gray-500">Severity:</span>
                            <span className="text-gray-700">{dv(ticket.severity)}</span>
                        </div>
                    </div>
                </div>

                {/* Work Notes - demonstrates updateData from sub-component */}
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Add Work Note</h4>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Enter work notes..."
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows={3}
                    />
                    <button
                        type="button"
                        onClick={handleNotesSubmit}
                        disabled={!notes.trim()}
                        className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Save size={12} />
                        Submit Note
                    </button>
                </div>
            </div>
        </div>
    );
};

//  Column Definitions

const dataColumns: VirtualTableColumnDef<SnowTicket>[] = [
    {
        id: 'number',
        accessorFn: (row) => dv(row.number),
        header: 'Number',
        size: 140,
        minSize: 120,
        meta: { filterType: 'text', filterPlaceholder: 'INC...' },
    },
    {
        id: 'short_description',
        accessorFn: (row) => dv(row.short_description),
        header: 'Short Description',
        minSize: 200,
        meta: {
            filterType: 'text',
            filterPlaceholder: 'Search description...',
            pinned: 'right',
            // Editable - text input
            canEdit: true,
            editType: 'text',
            editPlaceholder: 'Enter description...',
            editValidation: (value) => {
                if (!value || String(value).trim().length === 0) return 'Description is required';
                if (String(value).length < 5) return 'Must be at least 5 characters';
                return null;
            },
        },
    },
    {
        id: 'assigned_to',
        accessorFn: (row) => dv(row.assigned_to),
        header: 'Assigned To',
        size: 160,
        meta: {
            filterType: 'select',
            filterOptionsAsync: fetchAssigneeOptionsAsync,
            filterOptionsAsyncDebounce: 400,
            filterMultiSelect: true,
            filterPlaceholder: 'Filter assignee...',
            filterOptionsRetry: () => {
                logger.info('VirtualTableDemo: Retrying assignee filter options...');
            },
            filterOptionsRefetch: () => {
                logger.info('VirtualTableDemo: Refetching assignee filter options...');
            },
            // Editable - select with async options (reuses filter async fetcher)
            canEdit: true,
            editType: 'select',
            editOptionsAsync: fetchAssigneeOptionsAsync,
            editPlaceholder: 'Select assignee...',
            editOptionsRetry: () => {
                logger.info('VirtualTableDemo: Retrying assignee edit options...');
            },
            editOptionsRefetch: () => {
                logger.info('VirtualTableDemo: Refetching assignee edit options...');
            },
        },
    },
    {
        id: 'assignment_group',
        accessorFn: (row) => dv(row.assignment_group),
        header: 'Assignment Group',
        size: 170,
        meta: {
            filterType: 'select',
            filterOptionsAsync: fetchAssignmentGroupOptions,
            filterPlaceholder: 'Filter group...',
            filterOptionsRetry: () => {
                logger.info('VirtualTableDemo: Retrying group filter options...');
            },
            filterOptionsRefetch: () => {
                logger.info('VirtualTableDemo: Refetching group filter options...');
            },
        },
    },
    {
        id: 'priority',
        accessorFn: (row) => dv(row.priority),
        header: 'Priority',
        size: 120,
        sortingFn: prioritySortFn,
        meta: {
            filterType: 'select',
            filterOptions: PRIORITIES.map((p) => ({ label: p.display, value: p.display })),
            // Editable - select with static options
            canEdit: true,
            editType: 'select',
            editOptions: PRIORITIES.map((p) => ({ label: p.display, value: p.display })),
        },
        cell: ({ getValue, row, table }) => {
            // Show badge only when NOT editing
            const isEditing = table.options.meta?.editingRowIds?.[row.id];
            const val = getValue<string>();
            if (isEditing) return val; // EditableCell will handle rendering
            const colors: Record<string, string> = {
                '1 - Critical': 'bg-red-100 text-red-700',
                '2 - High': 'bg-orange-100 text-orange-700',
                '3 - Moderate': 'bg-yellow-100 text-yellow-700',
                '4 - Low': 'bg-green-100 text-green-700',
            };
            return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[val] ?? ''}`}>{val}</span>;
        },
    },
    {
        id: 'state',
        accessorFn: (row) => dv(row.state),
        header: 'State',
        size: 120,
        meta: {
            filterType: 'select',
            filterOptions: STATES.map((s) => ({ label: s.display, value: s.display })),
            // Editable - select, but only for non-Closed tickets
            canEdit: (row: Row<SnowTicket>) => dv(row.original.state) !== 'Closed',
            editType: 'select',
            editOptions: STATES.map((s) => ({ label: s.display, value: s.display })),
        },
    },
    {
        id: 'category',
        accessorFn: (row) => dv(row.category),
        header: 'Category',
        size: 130,
        meta: {
            filterType: 'select',
            filterOptions: getCategoryOptions,
            // Custom filter & editor using Input.TextField / Input.SelectField
            filterComponent: CustomTextFilter,
            canEdit: true,
            editComponent: CustomSelectEditor,
        },
    },
    {
        id: 'severity',
        accessorFn: (row) => dv(row.severity),
        header: 'Severity',
        size: 120,
        sortingFn: prioritySortFn,
        meta: {
            filterType: 'select',
            filterOptions: SEVERITIES.map((s) => ({ label: s.display, value: s.display })),
        },
    },
    {
        id: 'impact',
        accessorFn: (row) => dv(row.impact),
        header: 'Impact',
        size: 110,
        sortingFn: prioritySortFn,
        meta: {
            filterType: 'select',
            filterOptions: IMPACTS.map((i) => ({ label: i.display, value: i.display })),
        },
    },
    {
        id: 'urgency',
        accessorFn: (row) => dv(row.urgency),
        header: 'Urgency',
        size: 110,
        sortingFn: prioritySortFn,
        meta: {
            filterType: 'select',
            filterOptions: URGENCIES.map((u) => ({ label: u.display, value: u.display })),
        },
    },
    {
        id: 'opened_at',
        accessorFn: (row) => dv(row.opened_at),
        header: 'Opened At',
        size: 160,
        sortingFn: dateSortFn,
        meta: { filterType: 'date-range' },
        enableGlobalFilter: false,
    },
    {
        id: 'sla_due',
        accessorFn: (row) => dv(row.sla_due),
        header: 'SLA',
        size: 110,
        cell: ({ getValue }) => {
            const val = getValue<string>();
            const isBreach = val === 'BREACH';
            return <span className={`text-xs font-medium ${isBreach ? 'text-red-600' : 'text-green-600'}`}>{val}</span>;
        },
        meta: {
            canEdit: true,
        },
    },
    {
        id: 'tags',
        accessorFn: (row) => dv(row.tags),
        header: 'Tags',
        size: 200,
        minSize: 150,
        meta: {
            filterType: 'tags',
            tagSeparator: ',',
            filterPlaceholder: 'Filter tags...',
            canEdit: true,
            editType: 'tags',
            editPlaceholder: 'Add tag...',
        },
        cell: ({ getValue, row, table }) => {
            const isEditing = table.options.meta?.editingRowIds?.[row.id];
            const raw = getValue<string>();
            if (isEditing) return raw;
            if (!raw) return <span className="text-gray-300">-</span>;
            const tags = raw
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);
            return (
                <div className="flex flex-wrap gap-1">
                    {tags.map((tag, i) => (
                        <span key={`${tag}-${i}`} className="inline-block rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                            {tag}
                        </span>
                    ))}
                </div>
            );
        },
    },
];

//  Demo States

type DemoState = 'data' | 'loading' | 'error' | 'empty';

//  Component

const VirtualTableDemo = () => {
    const [demoState, setDemoState] = useState<DemoState>('data');
    const [rowCount, setRowCount] = useState(2000);
    const [tickets, setTickets] = useState(() => generateSnowTickets(2000));

    // Regenerate data when rowCount changes
    const handleRowCountChange = useCallback((count: number) => {
        setRowCount(count);
        setTickets(generateSnowTickets(count));
    }, []);

    const simulatedError = useMemo(
        () => (demoState === 'error' ? new Error('ECONNREFUSED: Connection refused to ServiceNow instance at dev12345.service-now.com') : null),
        [demoState],
    );

    const handleRetry = useCallback(() => {
        setDemoState('loading');
        setTimeout(() => setDemoState('data'), 1500);
    }, []);

    const [lastAction, setLastAction] = useState<string | null>(null);
    const [showSelected, setShowSelected] = useState(false);
    const [addRowMode, setAddRowMode] = useState<'inline' | 'modal'>('inline');
    const [showAddModal, setShowAddModal] = useState(false);
    const [modalForm, setModalForm] = useState({ short_description: '', assigned_to: '', priority: '4 - Low', category: '', tags: '' });

    const handleRowClick = useCallback((row: SnowTicket) => {
        setLastAction(`Row clicked: ${dv(row.number)} - ${dv(row.short_description)}`);
    }, []);

    //  updateData callback - mutates the ticket data on edit
    const updateData = useCallback((rowId: string, columnId: string, value: unknown) => {
        setTickets((prev) =>
            prev.map((ticket) => {
                if (dv(ticket.sys_id) !== rowId) return ticket;
                // Map column ID to SnowTicket field
                const fieldKey = columnId as keyof SnowTicket;
                if (columnId === 'work_notes') {
                    // Sub-component work notes - just log
                    setLastAction(`Work note added to ${dv(ticket.number)}: "${value}"`);
                    return ticket;
                }
                return {
                    ...ticket,
                    [fieldKey]: f(String(value)),
                };
            }),
        );
        setLastAction(`Updated row ${rowId}, column "${columnId}" -> "${value}"`);
    }, []);

    //  Row expansion predicate
    const getRowCanExpand = useCallback(() => true, []);

    //  Add Row
    const addRowIdCounter = useRef(rowCount);
    const handleAddRow = useCallback(() => {
        const idx = ++addRowIdCounter.current;
        const newId = `sys_new_${idx}`;
        setTickets((prev) => [
            {
                sys_id: f(newId),
                number: f(`INC${String(100000 + idx).padStart(7, '0')}`),
                short_description: f(''),
                assigned_to: f(''),
                assignment_group: f(''),
                priority: f('4 - Low', '4'),
                state: f('New', '1'),
                category: f(''),
                severity: f('3 - Low', '3'),
                impact: f('3 - Low', '3'),
                urgency: f('3 - Low', '3'),
                opened_at: f(new Date().toISOString().slice(0, 10)),
                sys_created_on: f(new Date().toISOString().replace('T', ' ').slice(0, 19)),
                sys_updated_on: f(new Date().toISOString().replace('T', ' ').slice(0, 19)),
                sla_due: f('In progress'),
                tags: f(''),
            } satisfies SnowTicket,
            ...prev,
        ]);
        setLastAction(`Added new row ${newId}`);
        return newId;
    }, []);

    //  Delete Row
    const handleDeleteRow = useCallback((rowId: string) => {
        setTickets((prev) => prev.filter((t) => dv(t.sys_id) !== rowId));
        setLastAction(`Deleted row ${rowId}`);
    }, []);

    //  Modal Add Row - submit handler
    const handleModalSubmit = useCallback(() => {
        if (!modalForm.short_description.trim()) return;
        const idx = ++addRowIdCounter.current;
        const newId = `sys_modal_${idx}`;
        setTickets((prev) => [
            {
                sys_id: f(newId),
                number: f(`INC${String(100000 + idx).padStart(7, '0')}`),
                short_description: f(modalForm.short_description),
                assigned_to: f(modalForm.assigned_to),
                assignment_group: f(''),
                priority: f(modalForm.priority, PRIORITIES.find((p) => p.display === modalForm.priority)?.value ?? '4'),
                state: f('New', '1'),
                category: f(modalForm.category),
                severity: f('3 - Low', '3'),
                impact: f('3 - Low', '3'),
                urgency: f('3 - Low', '3'),
                opened_at: f(new Date().toISOString().slice(0, 10)),
                sys_created_on: f(new Date().toISOString().replace('T', ' ').slice(0, 19)),
                sys_updated_on: f(new Date().toISOString().replace('T', ' ').slice(0, 19)),
                sla_due: f('In progress'),
                tags: f(modalForm.tags),
            } satisfies SnowTicket,
            ...prev,
        ]);
        setLastAction(`Added new row via modal: ${newId}`);
        setShowAddModal(false);
        setModalForm({ short_description: '', assigned_to: '', priority: '4 - Low', category: '', tags: '' });
    }, [modalForm]);

    // Build columns with the action column appended (includes edit/save/cancel)
    const columns = useMemo<VirtualTableColumnDef<SnowTicket>[]>(
        () => [
            ...dataColumns,
            {
                id: '__actions',
                header: 'Actions',
                size: 130,
                minSize: 130,
                maxSize: 130,
                enableSorting: false,
                enableColumnFilter: false,
                enableGlobalFilter: false,
                enableResizing: false,
                meta: { label: 'Actions' },
                cell: ({ row, table }) => {
                    const isEditing = table.options.meta?.editingRowIds?.[row.id];
                    const setEditing = table.options.meta?.setEditingRowIds;

                    if (isEditing) {
                        return (
                            <div className="flex items-center justify-center gap-1">
                                <button
                                    type="button"
                                    title="Done editing"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        table.options.meta?.commitRow?.(row.id);
                                        setLastAction(`Done editing ${dv(row.original.number)}`);
                                    }}
                                    className="cursor-pointer rounded p-1 text-green-600 transition-colors hover:bg-green-50"
                                >
                                    <Check size={14} />
                                </button>
                                <button
                                    type="button"
                                    title="Cancel editing"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        table.options.meta?.cancelRow?.(row.id);
                                        setLastAction(`Cancelled editing ${dv(row.original.number)}`);
                                    }}
                                    className="cursor-pointer rounded p-1 text-red-500 transition-colors hover:bg-red-50"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        );
                    }

                    return (
                        <div className="flex items-center justify-center gap-1">
                            <button
                                type="button"
                                title="View"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLastAction(`View ${dv(row.original.number)}`);
                                }}
                                className="cursor-pointer rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                            >
                                <Eye size={14} />
                            </button>
                            <button
                                type="button"
                                title="Edit"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditing?.((prev) => ({ ...prev, [row.id]: true }));
                                    setLastAction(`Editing ${dv(row.original.number)}`);
                                }}
                                className="cursor-pointer rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                            >
                                <Pencil size={14} />
                            </button>
                            {dv(row.original.state) !== 'Closed' && (
                                <button
                                    type="button"
                                    title="Delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        table.options.meta?.deleteRow?.(row.id);
                                    }}
                                    className="cursor-pointer rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    );
                },
            } as VirtualTableColumnDef<SnowTicket>,
        ],
        [],
    );

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">ServiceNow Incidents</h3>

                <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Rows:</label>
                    <select value={rowCount} onChange={(e) => handleRowCountChange(Number(e.target.value))} className="rounded border border-gray-300 px-2 py-1 text-xs">
                        {[50, 500, 2000, 10000, 50000].map((n) => (
                            <option key={n} value={n}>
                                {n.toLocaleString()}
                            </option>
                        ))}
                    </select>

                    <span className="mx-1 h-4 border-l border-gray-200" />

                    <label className="text-xs text-gray-500">Add Row:</label>
                    {(['inline', 'modal'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setAddRowMode(mode)}
                            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                                addRowMode === mode ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                    ))}

                    <span className="mx-1 h-4 border-l border-gray-200" />

                    {(['data', 'loading', 'error', 'empty'] as const).map((state) => (
                        <button
                            key={state}
                            onClick={() => setDemoState(state)}
                            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                                demoState === state ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {state.charAt(0).toUpperCase() + state.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {lastAction && (
                <p className="truncate text-xs text-gray-500">
                    Last action: <span className="font-medium text-gray-700">{lastAction}</span>
                </p>
            )}

            <div className="h-120">
                <VirtualTable
                    data={demoState === 'data' ? tickets : demoState === 'empty' ? [] : tickets}
                    columns={columns}
                    enableSorting={true}
                    enableColumnFilters={true}
                    enableGlobalFilter={true}
                    getRowId={(row) => dv(row.sys_id)}
                    enableRowSelection={true}
                    selectionColumnPinned="left"
                    overscan={5}
                    enableMultiRowSelection={true}
                    onRowClick={handleRowClick}
                    isLoading={demoState === 'loading'}
                    loadingMessage="Fetching incidents from ServiceNow..."
                    error={simulatedError}
                    errorTitle="Failed to load incident list"
                    onRetry={handleRetry}
                    isRetrying={false}
                    retryLabel="Reload"
                    emptyTitle="No incidents found"
                    emptyMessage="Try adjusting your filters or search terms"
                    initialColumnPinning={{ left: ['number'], right: ['opened_at'] }}
                    maxPinnedColumns={3}
                    //  Row Expansion
                    renderSubComponent={TicketSubComponent}
                    getRowCanExpand={getRowCanExpand}
                    //  Delete Row
                    onDeleteRow={handleDeleteRow}
                    //  Add Row (only used in inline mode)
                    onAddRow={addRowMode === 'inline' ? handleAddRow : undefined}
                    //  Inline Editing
                    updateData={updateData}
                    classNames={{
                        root: 'shadow-sm',
                    }}
                >
                    <VirtualTable.Toolbar>
                        <VirtualTable.GlobalSearch placeholder="Search incidents..." />
                        <VirtualTable.RowInfo />
                        {addRowMode === 'inline' ? (
                            <VirtualTable.AddRow />
                        ) : (
                            <VirtualTable.AddRow label="New Incident" icon={<Plus size={14} />} onClick={() => setShowAddModal(true)} />
                        )}
                        <VirtualTable.DeleteRow />
                        <VirtualTable.SelectedRows>
                            {({ selectedCount, clearSelection }) =>
                                selectedCount > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setShowSelected((v) => !v)}
                                            className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-100"
                                        >
                                            {selectedCount} selected
                                            {showSelected ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        </button>
                                        <button type="button" onClick={clearSelection} className="rounded px-1.5 py-1 text-[11px] text-gray-500 hover:bg-gray-100">
                                            Clear
                                        </button>
                                    </div>
                                )
                            }
                        </VirtualTable.SelectedRows>
                        <div className="flex-1" />
                        <VirtualTable.SortConfig />
                        <VirtualTable.FilterConfig />
                        <VirtualTable.ColumnConfig />
                    </VirtualTable.Toolbar>
                    <VirtualTable.SelectedRows>
                        {({ selectedRows, selectedCount }) =>
                            showSelected &&
                            selectedCount > 0 && (
                                <div className="max-h-40 overflow-y-auto border-b border-blue-100 bg-blue-50/40 px-3 py-2">
                                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-blue-500">Selected Rows ({selectedCount})</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(selectedRows as SnowTicket[]).map((row) => (
                                            <span
                                                key={dv(row.sys_id)}
                                                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-gray-700"
                                            >
                                                <span className="font-medium text-blue-600">{dv(row.number)}</span>
                                                <span className="max-w-32 truncate text-gray-500">{dv(row.short_description)}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )
                        }
                    </VirtualTable.SelectedRows>
                    <VirtualTable.Content />
                </VirtualTable>
            </div>

            <p className="text-[10px] text-gray-400">
                Tip: Toggle <strong>Add Row</strong> mode above. <strong>Inline</strong> inserts an empty row in edit mode; <strong>Modal</strong> opens a form dialog. Click the{' '}
                <strong>chevron</strong> to expand a row. Click <strong>Edit</strong> (pencil icon) to inline-edit <em>Short Description</em>, <em>Assigned To</em>,{' '}
                <em>Priority</em>, <em>State</em>, and <em>Tags</em>. The <em>State</em> column is not editable for Closed tickets. Validation is shown on{' '}
                <em>Short Description</em> (min 5 chars). Click the <strong>trash</strong> icon to delete a single row, or select rows and use the <strong>Delete</strong> toolbar
                button for bulk delete. The <em>Category</em> column uses a custom <code>filterComponent</code> (Input.TextField) and <code>editComponent</code>{' '}
                (Input.SelectField). The <em>Tags</em> column demonstrates the built-in <code>tags</code> filter and editor types.
            </p>

            {/*  Add Row Modal  */}
            <Modal open={showAddModal} onClose={() => setShowAddModal(false)} size="md" className="p-5">
                <Modal.Header>
                    <Plus size={16} className="text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-800">Create New Incident</h3>
                </Modal.Header>
                <Modal.Body className="overflow-visible">
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="mb-1 block text-[11px] font-medium text-gray-600">
                                Short Description <span className="text-red-500">*</span>
                            </label>
                            <TextInput
                                value={modalForm.short_description}
                                onChange={(val) => setModalForm((prev) => ({ ...prev, short_description: val }))}
                                placeholder="Enter description..."
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="mb-1 block text-[11px] font-medium text-gray-600">Assigned To</label>
                                <SelectInput
                                    value={modalForm.assigned_to}
                                    onChange={(val) => setModalForm((prev) => ({ ...prev, assigned_to: val }))}
                                    options={ASSIGNEES.map((a) => ({ label: a, value: a }))}
                                    placeholder="Select assignee..."
                                    clearable
                                />
                            </div>
                            <div className="flex-1">
                                <label className="mb-1 block text-[11px] font-medium text-gray-600">Priority</label>
                                <SelectInput
                                    value={modalForm.priority}
                                    onChange={(val) => setModalForm((prev) => ({ ...prev, priority: val }))}
                                    options={PRIORITIES.map((p) => ({ label: p.display, value: p.display }))}
                                    placeholder="Select priority..."
                                    clearable={false}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-medium text-gray-600">Category</label>
                            <SelectInput
                                value={modalForm.category}
                                onChange={(val) => setModalForm((prev) => ({ ...prev, category: val }))}
                                options={CATEGORIES.map((c) => ({ label: c, value: c }))}
                                placeholder="Select category..."
                                clearable
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-medium text-gray-600">Tags</label>
                            <TextInput value={modalForm.tags} onChange={(val) => setModalForm((prev) => ({ ...prev, tags: val }))} placeholder="e.g. network, vpn, urgent" />
                            <p className="mt-0.5 text-[10px] text-gray-400">Comma-separated tags</p>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Modal.ActionButton variant="secondary" onClick={() => setShowAddModal(false)}>
                        Cancel
                    </Modal.ActionButton>
                    <Modal.ActionButton variant="primary" onClick={handleModalSubmit} disabled={!modalForm.short_description.trim()}>
                        <Save size={12} />
                        Create Incident
                    </Modal.ActionButton>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default VirtualTableDemo;
