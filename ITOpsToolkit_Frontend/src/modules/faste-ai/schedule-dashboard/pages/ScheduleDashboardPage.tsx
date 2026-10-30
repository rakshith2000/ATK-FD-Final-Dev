import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useDashboardData } from '../hooks/queries/queries';
import { queryKeys } from '../constants/queryKeys';
import { MetricCards } from '../components/smart/MetricCards/MetricCards';
import { TaskExecutionReportModal } from '../components/smart/TaskExecutionReportModal/TaskExecutionReportModal';
import ActiveSchedulesModal from '../components/smart/ActiveSchedulesModal/ActiveSchedulesModal';
import { ScheduledTasksTable } from '../components/smart/ScheduledTasksTable/ScheduledTasksTable';
import { downloadLogs } from '../services/get-download-logs';
import { hasExecutionReport } from '../utils/scheduleHelpers';
import LoadingPlaceholder from '@/shared/components/ui/Placeholders/LoadingPlaceholder';
import { SelectInput, type SelectOption } from '@/shared/components/ui/InputFields';
import type { ScheduleTask, DashboardMetrics } from '../types/types';

export const ScheduleDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data, isLoading, isRefetching, error, refetch } = useDashboardData();

    const [selectedTower, setSelectedTower] = useState<string>('All Tower');
    const [selectedStatus, setSelectedStatus] = useState<string>('All Status');
    const [reportTask, setReportTask] = useState<ScheduleTask | null>(null);
    const [showActiveSchedules, setShowActiveSchedules] = useState<boolean>(false);

    const towerOptions: SelectOption[] = useMemo(
        () => [
            { label: 'All Tower', value: 'All Tower' },
            { label: 'Windows', value: 'Windows' },
            { label: 'Linux', value: 'Linux' },
            { label: 'Database', value: 'Database' },
            { label: 'Network', value: 'Network' },
            { label: 'Ticket Audit', value: 'Ticket Audit' },
        ],
        [],
    );

    const statusOptions: SelectOption[] = useMemo(
        () => [
            { label: 'All Status', value: 'All Status' },
            { label: 'Scheduled', value: 'Scheduled' },
            { label: 'Completed', value: 'Completed' },
            { label: 'Awaiting', value: 'Awaiting' },
            { label: 'Failed', value: 'Failed' },
            { label: 'Triggered', value: 'Triggered' },
        ],
        [],
    );

    const handleRefresh = async () => {
        setSelectedTower('All Tower');
        setSelectedStatus('All Status');
        await queryClient.invalidateQueries({
            queryKey: queryKeys.scheduler.dashboard(),
        });
        await refetch();
    };

    const towerFilteredTasks = useMemo(() => {
        if (!data?.tasks) return [];
        return data.tasks.filter((t: ScheduleTask) => {
            return selectedTower === 'All Tower' || t.tower.toLowerCase() === selectedTower.toLowerCase();
        });
    }, [data?.tasks, selectedTower]);

    const synchronizedMetrics = useMemo((): DashboardMetrics => {
        const defaultMetrics: DashboardMetrics = {
            total: towerFilteredTasks.length,
            scheduled: 0,
            completed: 0,
            failed: 0,
            triggered: 0,
            awaiting: 0,
            windows: 0,
            linux: 0,
            database: 0,
            network: 0,
            ticketAudit: 0,
        };

        return towerFilteredTasks.reduce((acc, task) => {
            if (task.status === 'Scheduled') acc.scheduled += 1;
            if (task.status === 'Completed') acc.completed += 1;
            if (task.status === 'Failed') acc.failed += 1;
            if (task.status === 'Triggered') acc.triggered += 1;
            if (task.status === 'Awaiting') acc.awaiting += 1;

            const towerLower = (task.tower || '').toLowerCase();
            if (towerLower === 'windows') acc.windows += 1;
            if (towerLower === 'linux') acc.linux += 1;
            if (towerLower === 'database') acc.database += 1;
            if (towerLower === 'network') acc.network += 1;
            if (towerLower === 'ticket audit') acc.ticketAudit += 1;

            return acc;
        }, defaultMetrics);
    }, [towerFilteredTasks]);

    const filteredTasksForTable = useMemo(() => {
        return towerFilteredTasks.filter((t: ScheduleTask) => {
            return selectedStatus === 'All Status' || t.status === selectedStatus;
        });
    }, [towerFilteredTasks, selectedStatus]);

    const handleRowClick = useCallback((task: ScheduleTask) => {
        if (hasExecutionReport(task)) {
            setReportTask(task);
        }
    }, []);

    const handleViewReport = useCallback((task: ScheduleTask) => {
        setReportTask(task);
    }, []);

    const handleDownloadLogs = useCallback((task: ScheduleTask) => {
        downloadLogs(task);
    }, []);

    if (isLoading || isRefetching) {
        return (
            <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <LoadingPlaceholder />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
                <div className="text-red-500 text-lg font-bold mb-2">Something Went Wrong</div>
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-0 bg-slate-50 text-slate-800 flex flex-col overflow-y-auto pb-6">
            <div className="p-3 sm:p-4 max-w-[1600px] w-full mx-auto space-y-3.5 flex-1">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--brand-title-primary-color)' }}>
                        Schedule Dashboard
                    </h1>

                    <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-end">
                        <button
                            onClick={() =>
                                navigate({
                                    to: '/faste-ai/schedule-dashboard/schedule-form',
                                })
                            }
                            className="text-white font-bold text-xs px-2.5 py-1 rounded-xl shadow opacity-90 hover:opacity-100 transition-all active:scale-95 h-8.5 flex items-center justify-center"
                            style={{ backgroundColor: 'var(--brand-title-primary-color)' }}
                        >
                            + New Task
                        </button>
                        <button
                            onClick={handleRefresh}
                            className="border bg-white p-1 rounded-xl text-xs hover:bg-slate-50 shadow-sm active:scale-95 flex items-center justify-center h-8.5 w-8.5 box-border"
                            style={{ borderColor: 'rgba(1, 26, 128, 0.2)' }}
                            type="button"
                        >
                            <RefreshCw size={14} style={{ color: 'var(--brand-title-primary-color)' }} />
                        </button>
                        <span
                            className="text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-inner h-8.5 flex items-center justify-center box-border"
                            style={{ backgroundColor: 'var(--brand-title-primary-color)' }}
                        >
                            Total: {synchronizedMetrics.total}
                        </span>

                        <div className="w-40 sm:w-44">
                            <SelectInput
                                options={towerOptions}
                                value={selectedTower}
                                clearable={false}
                                onChange={(v) => setSelectedTower(v as string)}
                                triggerClassName="rounded-xl py-1.5 px-3 shadow-sm bg-white min-h-[34px] text-xs font-bold border-slate-200"
                                style={{ color: 'var(--brand-title-primary-color)' }}
                            />
                        </div>
                    </div>
                </div>

                <MetricCards metrics={synchronizedMetrics} tasks={data?.tasks || []} setShowActiveSchedules={setShowActiveSchedules} />

                <ScheduledTasksTable
                    tasks={filteredTasksForTable}
                    isLoading={isLoading}
                    isRefetching={isRefetching}
                    error={error}
                    refetch={refetch}
                    selectedStatus={selectedStatus}
                    setSelectedStatus={setSelectedStatus}
                    statusOptions={statusOptions}
                    onRowClick={handleRowClick}
                    onViewReport={handleViewReport}
                    onDownloadLogs={handleDownloadLogs}
                />
            </div>

            {reportTask && <TaskExecutionReportModal task={reportTask} onClose={() => setReportTask(null)} />}

            {showActiveSchedules && <ActiveSchedulesModal isOpen={showActiveSchedules} tasks={data.tasks} onClose={() => setShowActiveSchedules(false)} />}
        </div>
    );
};

export default ScheduleDashboardPage;
