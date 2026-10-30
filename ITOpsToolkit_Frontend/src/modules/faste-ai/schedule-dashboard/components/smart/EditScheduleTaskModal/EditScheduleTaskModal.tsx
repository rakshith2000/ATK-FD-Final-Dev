import React, { useMemo } from 'react';
import Modal from '@/shared/components/ui/Modal/Modal';
import { TextInput, SelectInput, MultiSelectInput, DateInput, type SelectOption } from '@/shared/components/ui/InputFields';
import type { ScheduleTask, Tower, TaskStatus } from '../../../types/types';

interface EditScheduleTaskModalProps {
    open: boolean;
    editingItem: ScheduleTask | null;
    isLoadingCis: boolean;
    isPending: boolean;
    cis: Array<{ name: string; sys_id: string }>;
    onClose: () => void;
    onChange: (updatedItem: ScheduleTask) => void;
    onSave: (task: ScheduleTask) => void;
}

export const EditScheduleTaskModal: React.FC<EditScheduleTaskModalProps> = ({ open, editingItem, isLoadingCis, isPending, cis, onClose, onChange, onSave }) => {
    const towerOptions: SelectOption[] = useMemo(
        () => [
            { label: 'Windows', value: 'Windows' },
            { label: 'Linux', value: 'Linux' },
            { label: 'Network', value: 'Network' },
            { label: 'Database', value: 'Database' },
            { label: 'Ticket Audit', value: 'Ticket Audit' },
        ],
        [],
    );

    const reportTypeOptions: SelectOption[] = useMemo(
        () => [
            { label: 'Email', value: 'Email' },
            { label: 'Self download', value: 'Self download' },
            { label: 'Database', value: 'Database' },
        ],
        [],
    );

    const reportFormatOptions: SelectOption[] = useMemo(
        () => [
            { label: 'PDF', value: 'PDF' },
            { label: 'CSV', value: 'CSV' },
            { label: 'Excel', value: 'Excel' },
            { label: 'DOC', value: 'DOC' },
            { label: 'Ticket Audit Table', value: 'Ticket Audit Table' },
        ],
        [],
    );

    const statusOptions: SelectOption[] = useMemo(
        () => [
            { label: 'Scheduled', value: 'Scheduled' },
            { label: 'Awaiting', value: 'Awaiting' },
            { label: 'Completed', value: 'Completed' },
            { label: 'Failed', value: 'Failed' },
            { label: 'Triggered', value: 'Triggered' },
        ],
        [],
    );

    const ticketOptions: SelectOption[] = useMemo(
        () => [
            { label: 'Yes', value: 'true' },
            { label: 'No', value: 'false' },
        ],
        [],
    );

    const recurrenceOptions: SelectOption[] = useMemo(
        () => [
            { label: 'One-time', value: 'None' },
            { label: 'Daily', value: 'Daily' },
            { label: 'Weekly', value: 'Weekly' },
            { label: 'Monthly', value: 'Monthly' },
        ],
        [],
    );

    const mappedCiOptions = useMemo(() => {
        let list = cis || [];
        if (editingItem?.tower) {
            list = list.filter((ci) => ci.name.toLowerCase().includes(editingItem.tower.toLowerCase()));
        }
        return list.map((c) => ({ label: c.name, value: c.sys_id }));
    }, [cis, editingItem?.tower]);

    const handleTimeClick = (e: React.MouseEvent<HTMLInputElement>) => {
        try {
            e.currentTarget.showPicker();
        } catch {}
    };

    if (!editingItem) return null;

    return (
        <Modal open={open} size="xl" onClose={onClose} className="p-0">
            <Modal.Header className="px-5 py-4 bg-[#DEEEFF] border-b border-slate-200/60 flex items-center justify-between">
                <span className="font-extrabold text-(--brand-title-primary-color) text-sm tracking-tight">Edit - {editingItem.taskName}</span>
            </Modal.Header>

            <Modal.Body className="px-6 pt-2 pb-6 space-y-4 max-h-[70dvh] overflow-y-auto mb-0">
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12">
                        <label className="text-[11px] font-bold text-slate uppercase tracking-wider block mb-1">Task Name</label>
                        <TextInput value={editingItem.taskName} onChange={(v) => onChange({ ...editingItem, taskName: v })} />
                    </div>

                    <div className="col-span-12">
                        <label className="text-[11px] font-bold text-slate uppercase tracking-wider block mb-1">Description</label>
                        <TextInput value={editingItem.description || ''} onChange={(v) => onChange({ ...editingItem, description: v })} />
                    </div>

                    <div className="col-span-6">
                        <label className="text-[11px] font-bold text-slate uppercase tracking-wider block mb-1">Tower</label>
                        <SelectInput
                            value={editingItem.tower}
                            options={towerOptions}
                            onChange={(v) => {
                                const isTicketAudit = v === 'Ticket Audit';
                                onChange({
                                    ...editingItem,
                                    tower: v as Tower,
                                    ciItems: isTicketAudit ? [] : editingItem.ciItems,
                                    ticketRequired: isTicketAudit ? false : editingItem.ticketRequired,
                                    reportType: isTicketAudit ? 'Database' : editingItem.reportType === 'Database' ? 'Self download' : editingItem.reportType,
                                    reportFormat: isTicketAudit
                                        ? 'Ticket Audit Table'
                                        : ['Ticket Audit Table', 'incident_master_table'].includes(editingItem.reportFormat)
                                          ? 'PDF'
                                          : editingItem.reportFormat,
                                });
                            }}
                        />
                    </div>

                    <div className="col-span-6">
                        <label className="text-[11px] font-bold text-slate uppercase tracking-wider block mb-1">SOP Reference</label>
                        <TextInput value={editingItem.sop} onChange={(v) => onChange({ ...editingItem, sop: v })} />
                    </div>

                    <div className="col-span-6">
                        <label className="text-[11px] font-bold text-slate uppercase tracking-wider block mb-1">Report Type</label>
                        <SelectInput
                            value={editingItem.reportType}
                            options={reportTypeOptions}
                            disabled={editingItem.tower === 'Ticket Audit'}
                            onChange={(v) => {
                                if (v === 'Database') {
                                    onChange({
                                        ...editingItem,
                                        reportType: 'Database',
                                        tower: 'Ticket Audit',
                                        reportFormat: 'Ticket Audit Table',
                                        ticketRequired: false,
                                        ciItems: [],
                                    });
                                } else {
                                    onChange({ ...editingItem, reportType: v });
                                }
                            }}
                        />
                    </div>

                    <div className="col-span-6">
                        <label className="text-[11px] font-bold text-slate uppercase tracking-wider block mb-1">Report Format</label>
                        <SelectInput
                            value={editingItem.reportFormat}
                            options={reportFormatOptions}
                            disabled={editingItem.tower === 'Ticket Audit'}
                            onChange={(v) => {
                                if (v === 'Ticket Audit Table' || v === 'incident_master_table') {
                                    onChange({
                                        ...editingItem,
                                        reportFormat: 'Ticket Audit Table',
                                        tower: 'Ticket Audit',
                                        reportType: 'Database',
                                        ticketRequired: false,
                                        ciItems: [],
                                    });
                                } else {
                                    onChange({ ...editingItem, reportFormat: v });
                                }
                            }}
                        />
                    </div>

                    <div className="col-span-6">
                        <label className="text-[11px] font-bold text-slate uppercase tracking-wider block mb-1">Status</label>
                        <SelectInput value={editingItem.status} options={statusOptions} onChange={(v) => onChange({ ...editingItem, status: v as TaskStatus })} />
                    </div>

                    <div className="col-span-6">
                        <label className="text-[11px] font-bold text-slate uppercase tracking-wider block mb-1">Ticket Required</label>
                        <SelectInput
                            value={editingItem.ticketRequired ? 'true' : 'false'}
                            options={ticketOptions}
                            disabled={editingItem.tower === 'Ticket Audit'}
                            onChange={(v) => onChange({ ...editingItem, ticketRequired: v === 'true' })}
                        />
                    </div>

                    <div className="col-span-12">
                        <label className="text-[11px] font-bold text-slate uppercase tracking-wider block mb-1">CI Items</label>
                        <MultiSelectInput
                            value={editingItem.ciItems || []}
                            options={mappedCiOptions}
                            isLoading={isLoadingCis}
                            disabled={editingItem.tower === 'Ticket Audit'}
                            onChange={(v) => onChange({ ...editingItem, ciItems: v })}
                        />
                    </div>

                    <div className="col-span-12 pt-2 border-t border-slate-100 mt-2">
                        <label className="text-xs font-black text-blue-950">Schedule Period Configuration</label>
                    </div>

                    <div className={editingItem.tower === 'Ticket Audit' ? 'col-span-12' : 'col-span-6'}>
                        <label className="text-[11px] font-bold text-slate uppercase tracking-wider block mb-1">Start Date</label>
                        <DateInput
                            value={editingItem.schedulePeriod?.startdata || ''}
                            onChange={(v) =>
                                onChange({
                                    ...editingItem,
                                    schedulePeriod: { ...editingItem.schedulePeriod, startdata: v || '' },
                                })
                            }
                        />
                    </div>

                    {editingItem.tower !== 'Ticket Audit' && (
                        <div className="col-span-6">
                            <label className="text-[11px] font-bold text-slate uppercase tracking-wider block mb-1">Start Time</label>
                            <input
                                type="time"
                                className="w-full bg-slate-50 border border-gray-300 rounded px-3 py-1 text-xs outline-none focus:border-blue-500 h-[26px] cursor-pointer"
                                value={editingItem.schedulePeriod?.starttime || ''}
                                onClick={handleTimeClick}
                                onChange={(e) =>
                                    onChange({
                                        ...editingItem,
                                        schedulePeriod: { ...editingItem.schedulePeriod, starttime: e.target.value },
                                    })
                                }
                            />
                        </div>
                    )}

                    <div className="col-span-6">
                        <label className="text-[11px] font-bold text-slate uppercase tracking-wider block mb-1">End Date</label>
                        <DateInput
                            value={editingItem.schedulePeriod?.enddate || ''}
                            min={editingItem.schedulePeriod?.startdata || undefined}
                            onChange={(v) =>
                                onChange({
                                    ...editingItem,
                                    schedulePeriod: { ...editingItem.schedulePeriod, enddate: v || '' },
                                })
                            }
                        />
                    </div>

                    <div className="col-span-6">
                        <label className="text-[11px] font-bold text-slate uppercase tracking-wider block mb-1">Recurrence</label>
                        <SelectInput
                            value={
                                editingItem.schedulePeriod?.daily
                                    ? 'Daily'
                                    : editingItem.schedulePeriod?.weekly
                                      ? 'Weekly'
                                      : editingItem.schedulePeriod?.monthly
                                        ? 'Monthly'
                                        : 'None'
                            }
                            options={recurrenceOptions}
                            onChange={(v) =>
                                onChange({
                                    ...editingItem,
                                    schedulePeriod: {
                                        ...editingItem.schedulePeriod,
                                        daily: v === 'Daily',
                                        weekly: v === 'Weekly',
                                        monthly: v === 'Monthly',
                                    },
                                })
                            }
                        />
                    </div>
                </div>
            </Modal.Body>

            <Modal.Footer className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 rounded-b-lg">
                <button
                    type="button"
                    onClick={onClose}
                    className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                >
                    Discard
                </button>
                <button
                    type="button"
                    onClick={() => {
                        let taskToSave = { ...editingItem };
                        if (taskToSave.tower === 'Ticket Audit') {
                            const now = new Date();
                            const triggerDate = new Date(now.getTime() + 5 * 60 * 1000);
                            const hh = String(triggerDate.getHours()).padStart(2, '0');
                            const mm = String(triggerDate.getMinutes()).padStart(2, '0');
                            const ss = String(triggerDate.getSeconds()).padStart(2, '0');
                            const triggerTime = `${hh}:${mm}:${ss}`;

                            const yyyy = triggerDate.getFullYear();
                            const month = String(triggerDate.getMonth() + 1).padStart(2, '0');
                            const dd = String(triggerDate.getDate()).padStart(2, '0');
                            const triggerDateStr = `${yyyy}-${month}-${dd}`;

                            const currentStartDate = taskToSave.schedulePeriod?.startdata;
                            const finalStartDate = !currentStartDate || currentStartDate < triggerDateStr ? triggerDateStr : currentStartDate;

                            taskToSave = {
                                ...taskToSave,
                                ciItems: [],
                                reportType: 'Database',
                                reportFormat: 'Ticket Audit Table',
                                ticketRequired: false,
                                schedulePeriod: {
                                    ...taskToSave.schedulePeriod,
                                    startdata: finalStartDate,
                                    starttime: triggerTime,
                                },
                            };
                        }
                        onSave(taskToSave);
                    }}
                    disabled={isPending}
                    className="bg-(--brand-title-primary-color) text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow hover:bg-blue-900 active:scale-95 transition-all flex items-center justify-center min-w-30 cursor-pointer"
                >
                    {isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save Changes'}
                </button>
            </Modal.Footer>
        </Modal>
    );
};
