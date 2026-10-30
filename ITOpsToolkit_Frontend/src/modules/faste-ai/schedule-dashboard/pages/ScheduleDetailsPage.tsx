import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Calendar as CalendarIcon, X } from 'lucide-react';
import { schedulerAxios } from '@/api/axios-clients/fasteai/fasteai-api-client';
import { ScheduleTaskCard } from '../components/ui/ScheduleTaskCard/ScheduleTaskCard';
import { TaskExecutionReportModal } from '../components/smart/TaskExecutionReportModal/TaskExecutionReportModal';
import { EditScheduleTaskModal } from '../components/smart/EditScheduleTaskModal/EditScheduleTaskModal';
import { queryKeys } from '../constants/queryKeys';
import { useServiceNowCis } from '../hooks/queries/queries';
import { useScheduleFormQuery } from '../hooks/useScheduleForm';
import { downloadLogs } from '../services/get-download-logs';
import { checkAwaitingTask } from '../services/check-awaiting-task';
import { getNextRunDate, matchesScheduleDate } from '../utils/scheduleHelpers';
import Modal from '@/shared/components/ui/Modal/Modal';
import { TextInput, MultiSelectInput, type SelectOption } from '@/shared/components/ui/InputFields';
import { useScheduleMutations } from '../hooks/useScheduleMutations';
import LoadingPlaceholder from '@/shared/components/ui/Placeholders/LoadingPlaceholder';
import EmptyPlaceholder from '@/shared/components/ui/Placeholders/EmptyPlaceholder';
import type { ScheduleTask, ScheduleState, TaskStatus, ApiError } from '../types/types';

import MonthCalendar, { toDateStr, parseDate, isSameDay, isBetween, type CalendarDay } from '../../../../shared/components/ui/InputFields/shared/Calendar';

interface DateRangeFilterProps {
    value: string | { startDate?: string; endDate?: string };
    onChange: (val: string | { startDate?: string; endDate?: string }) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    const today = useMemo(() => new Date(), []);
    const [viewYear, setViewYear] = useState<number>(today.getFullYear());
    const [viewMonth, setViewMonth] = useState<number>(today.getMonth());

    const [fromDate, setFromDate] = useState<string>(typeof value === 'object' ? value.startDate || '' : '');
    const [toDateInput, setToDateInput] = useState<string>(typeof value === 'object' ? value.endDate || '' : '');

    const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

    const popoverRef = useRef<HTMLDivElement>(null);

    const hasActiveFilter = useMemo(() => {
        if (typeof value === 'string') return !!value;
        if (typeof value === 'object' && value) return !!(value.startDate || value.endDate);
        return false;
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (typeof value === 'object' && value) {
            setFromDate(value.startDate || '');
            setToDateInput(value.endDate || '');
        } else if (typeof value === 'string') {
            const parsed = parseDate(value);
            if (parsed) {
                setViewYear(parsed.getFullYear());
                setViewMonth(parsed.getMonth());
            } else {
                setFromDate('');
                setToDateInput('');
            }
        }
    }, [value]);

    const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFrom = e.target.value;
        setFromDate(newFrom);
        if (toDateInput && newFrom > toDateInput) {
            setToDateInput(newFrom);
        }
    };

    const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTo = e.target.value;
        setToDateInput(newTo);
        if (fromDate && newTo < fromDate) {
            setFromDate(newTo);
        }
    };

    const handlePrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear((y) => y - 1);
        } else {
            setViewMonth((m) => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear((y) => y + 1);
        } else {
            setViewMonth((m) => m + 1);
        }
    };

    const handleDayClick = (clickedDate: Date) => {
        const selectedStr = toDateStr(clickedDate);
        setFromDate('');
        setToDateInput('');
        onChange(selectedStr);
        setIsOpen(false);
    };

    const handleApplyCustomRange = () => {
        if (fromDate || toDateInput) {
            onChange({ startDate: fromDate, endDate: toDateInput });
        }
        setIsOpen(false);
    };

    const handleClearFilter = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setFromDate('');
        setToDateInput('');
        onChange('');
        setIsOpen(false);
    };

    const getDayClassName = (calendarDay: CalendarDay): string => {
        if (!calendarDay.isCurrentMonth) {
            return 'text-gray-300 pointer-events-none';
        }

        const d = calendarDay.date;
        const selectedSingleDate = typeof value === 'string' ? parseDate(value) : null;
        const rangeStart = fromDate ? parseDate(fromDate) : null;
        const rangeEnd = toDateInput ? parseDate(toDateInput) : null;

        if (selectedSingleDate && isSameDay(d, selectedSingleDate)) {
            return 'bg-[#2563EB] text-white font-bold rounded-full shadow-sm';
        }

        if (rangeStart && isSameDay(d, rangeStart)) {
            return 'bg-[#2563EB] text-white font-bold rounded-l-full';
        }
        if (rangeEnd && isSameDay(d, rangeEnd)) {
            return 'bg-[#2563EB] text-white font-bold rounded-r-full';
        }

        if (rangeStart && rangeEnd && isBetween(d, rangeStart, rangeEnd)) {
            return 'bg-blue-100 text-blue-700 font-semibold';
        }

        if (rangeStart && !rangeEnd && hoveredDate) {
            if (isBetween(d, rangeStart, hoveredDate)) {
                return 'bg-blue-50 text-blue-600';
            }
        }

        return 'text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-full';
    };

    const displayLabel = useMemo(() => {
        if (typeof value === 'string' && value) return value;
        if (typeof value === 'object' && (value.startDate || value.endDate)) {
            if (value.startDate && value.endDate) return `${value.startDate} - ${value.endDate}`;
            return value.startDate ? `From ${value.startDate}` : `To ${value.endDate}`;
        }
        return 'Filter by date';
    }, [value]);

    return (
        <div className="relative w-45" ref={popoverRef}>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="w-full flex items-center justify-between rounded-full py-1.5 px-4 shadow-sm bg-white min-h-8.5 border border-slate-200 hover:border-gray-300 text-xs font-bold text-slate-700 focus:outline-none"
            >
                <span className="truncate">{displayLabel}</span>
                <div className="flex items-center shrink-0 ml-1 gap-1">
                    {hasActiveFilter && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={handleClearFilter}
                            onKeyDown={(e) => e.key === 'Enter' && handleClearFilter()}
                            className="p-0.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                            title="Clear date filter"
                        >
                            <X size={13} />
                        </span>
                    )}
                    <CalendarIcon size={14} className="text-slate-500" />
                </div>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 space-y-4">
                    <div className="flex justify-center">
                        <MonthCalendar
                            year={viewYear}
                            month={viewMonth}
                            onPrev={handlePrevMonth}
                            onNext={handleNextMonth}
                            getDayClassName={getDayClassName}
                            onDayClick={handleDayClick}
                            onDayHover={setHoveredDate}
                        />
                    </div>
                    <div className="border-t border-slate-100 pt-3">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">CUSTOM RANGE</label>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase mb-1">FROM</span>
                                <input
                                    type="date"
                                    value={fromDate}
                                    max={toDateInput || undefined}
                                    onChange={handleFromChange}
                                    className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase mb-1">TO</span>
                                <input
                                    type="date"
                                    value={toDateInput}
                                    min={fromDate || undefined}
                                    onChange={handleToChange}
                                    className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasActiveFilter && (
                                <button
                                    type="button"
                                    onClick={handleClearFilter}
                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                                >
                                    Clear
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleApplyCustomRange}
                                className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const ScheduleDetailsPage: React.FC = () => {
    const location = useLocation();

    const passedState = location.state as unknown as ScheduleState | null;
    const filterKey = passedState?.filterKey || 'status';
    const filterValue = passedState?.filterValue || 'All';

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState<string | { startDate?: string; endDate?: string }>('');
    const [selectedTowers, setSelectedTowers] = useState<string[]>([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState<ScheduleTask | null>(null);
    const [reportTask, setReportTask] = useState<ScheduleTask | null>(null);

    const [cloudData] = useState({ keyCloakToken: 'session' });

    useScheduleFormQuery();
    const { data: cis = [], isLoading: isLoadingCis } = useServiceNowCis(!!cloudData.keyCloakToken);

    const { updateTaskMutation, runTaskMutation, isDeleteModalOpen, isDeleting, taskToDeleteId, openDeleteModal, closeDeleteModal, confirmDelete } = useScheduleMutations(() =>
        setShowEditModal(false),
    );

    const headerTowerOptions: SelectOption[] = useMemo(
        () => [
            { label: 'Windows', value: 'windows' },
            { label: 'Linux', value: 'linux' },
            { label: 'Network', value: 'network' },
            { label: 'Database', value: 'database' },
            { label: 'Ticket Audit', value: 'ticket audit' },
        ],
        [],
    );

    const {
        data: tasks = [],
        isLoading: tasksLoading,
        isFetching: tasksFetching,
        refetch: refetchTasks,
    } = useQuery<ScheduleTask[], ApiError>({
        queryKey: queryKeys.scheduler.tasks(),
        queryFn: async () => {
            const res = await schedulerAxios.get('/group/');
            const rawTasks = Array.isArray(res.data?.data) ? res.data.data : [];
            return rawTasks.map((t: unknown) => {
                const rawStatus = (t as { status?: unknown }).status;
                const status = rawStatus === 'active' ? 'Scheduled' : (rawStatus as TaskStatus);
                return { ...(t as ScheduleTask), status };
            });
        },
        initialData: passedState?.tasks
            ? () =>
                  passedState.tasks.map((t) => {
                      const rawStatus = (t as { status?: unknown }).status;
                      const status = rawStatus === 'active' ? 'Scheduled' : (t.status as TaskStatus);
                      return { ...t, status };
                  })
            : undefined,
        staleTime: 0,
        refetchOnMount: 'always',
    });

    const handleEdit = (item: ScheduleTask) => {
        setEditingItem({ ...item });
        setShowEditModal(true);
    };

    const handleRun = (item: ScheduleTask) => {
        runTaskMutation.mutate(item);
    };

    const matchesSelectedDate = (item: ScheduleTask) => {
        if (!selectedDate) return true;

        if (typeof selectedDate === 'string') {
            const normalizedSelectedDate = selectedDate.split(/[ T]/)[0];
            const scheduleMatches = matchesScheduleDate(item.schedulePeriod, normalizedSelectedDate);
            if (scheduleMatches) return true;

            const nextRunDate = getNextRunDate(item.schedulePeriod)?.split(/[ T]/)[0];
            return nextRunDate === normalizedSelectedDate;
        }

        return matchesScheduleDate(item.schedulePeriod, selectedDate);
    };

    const filteredItems = useMemo(() => {
        return tasks.filter((item) => {
            const targetValue = item[filterKey as keyof ScheduleTask];
            const normalizedTarget = typeof targetValue === 'object' ? '' : String(targetValue ?? '');

            const matchFilter = filterKey === 'awaiting' ? checkAwaitingTask(item) : filterValue === 'All' || normalizedTarget.toLowerCase() === filterValue.toLowerCase();
            const matchDate = matchesSelectedDate(item);
            const matchTower = selectedTowers.length === 0 || selectedTowers.includes((item.tower || '').toLowerCase());
            const matchSearch =
                !searchTerm || (item.taskName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (item.sop || '').toLowerCase().includes(searchTerm.toLowerCase());
            return matchFilter && matchTower && matchSearch && matchDate;
        });
    }, [tasks, filterKey, filterValue, selectedTowers, searchTerm, selectedDate]);

    if (tasksLoading) {
        return (
            <div className="h-screen w-full bg-slate-50 flex flex-col items-center justify-center">
                <LoadingPlaceholder />
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-[#f8faff] text-slate-800 flex flex-col overflow-y-auto pb-12 p-6">
            <div className="max-w-[1600px] w-full mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-black text-(--brand-title-primary-color) tracking-tight">
                            Schedule Details: <span className="text-(--brand-title-primary-color) capitalize">{filterKey === 'awaiting' ? 'Awaiting Today' : filterValue}</span>
                        </h1>
                    </div>

                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-end flex-wrap">
                        <div className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-full shadow-sm flex items-center h-8.5 box-border">
                            Total: {filteredItems.length}
                        </div>

                        <div className="w-52">
                            <MultiSelectInput
                                value={selectedTowers}
                                options={headerTowerOptions}
                                placeholder="Select Tower"
                                onChange={(v) => setSelectedTowers(v)}
                                triggerClassName="rounded-full py-1.5 px-4 shadow-sm bg-white min-h-[34px] border-slate-200 hover:border-gray-300 text-xs font-bold text-slate-700"
                                chipClassName="text-[10px] rounded-lg bg-slate-100 text-slate-700 border-slate-200 px-2 py-0.5"
                            />
                        </div>

                        <DateRangeFilter value={selectedDate} onChange={setSelectedDate} />

                        <div className="w-full sm:w-52">
                            <TextInput
                                placeholder="Search tasks..."
                                value={searchTerm}
                                onChange={(v) => setSearchTerm(v)}
                                className="rounded-full py-1.5 px-4 shadow-sm border-slate-200 h-8.5 text-xs font-medium"
                            />
                        </div>
                    </div>
                </div>

                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                        {filteredItems.map((item) => (
                            <ScheduleTaskCard
                                key={item._id}
                                item={item}
                                cis={cis}
                                deletingId={isDeleting && taskToDeleteId === item._id ? item._id : null}
                                onEdit={handleEdit}
                                onRun={handleRun}
                                onDelete={openDeleteModal}
                                onViewReport={(task) => setReportTask(task)}
                                onDownloadLogs={downloadLogs}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200/60 rounded-3xl">
                        <EmptyPlaceholder
                            message="No schedule tasks found matching your filter criteria"
                            iconSize={120}
                            onRetry={() => refetchTasks()}
                            isRefetching={tasksFetching}
                            retryLabel="Refresh Tasks"
                        />
                    </div>
                )}

                {reportTask && <TaskExecutionReportModal task={reportTask} onClose={() => setReportTask(null)} />}

                {showEditModal && editingItem && (
                    <EditScheduleTaskModal
                        open={showEditModal}
                        editingItem={editingItem}
                        isLoadingCis={isLoadingCis}
                        isPending={updateTaskMutation.isPending}
                        cis={cis}
                        onClose={() => setShowEditModal(false)}
                        onChange={setEditingItem}
                        onSave={(item) => updateTaskMutation.mutate(item)}
                    />
                )}

                {isDeleteModalOpen && (
                    <Modal open={isDeleteModalOpen} size="md" onClose={closeDeleteModal} className="p-6">
                        <Modal.Body className="mb-6 flex flex-col items-start text-xs text-gray leading-relaxed">
                            <div className="flex items-center gap-4 mb-4 w-full">
                                <div className="bg-[#FFF1F1] text-[#E11D48] p-2.5 rounded-xl border border-[#FFE4E6] shrink-0 flex items-center justify-center">
                                    <AlertTriangle size={20} className="stroke-[2.5]" />
                                </div>
                                <h3 className="text-base font-extrabold text-[#0B2545] tracking-tight">Delete Task Group</h3>
                            </div>
                            <p className="text-[13px] font-medium text-[#475569] leading-relaxed pl-1 pr-2">
                                Are you completely sure you want to delete this task group? This workflow operation cannot be undone.
                            </p>
                        </Modal.Body>

                        <Modal.Footer className="flex gap-3 justify-end items-center">
                            <Modal.ActionButton variant="secondary" onClick={closeDeleteModal} disabled={isDeleting} className="max-w-25 py-2 font-bold">
                                Cancel
                            </Modal.ActionButton>
                            <Modal.ActionButton
                                variant="danger"
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="max-w-32.5 py-2 font-bold bg-[#D90429] hover:bg-[#B30322] text-white rounded-xl border-none"
                            >
                                {isDeleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Delete Task'}
                            </Modal.ActionButton>
                        </Modal.Footer>
                    </Modal>
                )}
            </div>
        </div>
    );
};

export default ScheduleDetailsPage;
