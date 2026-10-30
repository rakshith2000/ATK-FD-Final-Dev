import { appConfig } from '@/config/app-config';
import { getValidToken } from '@/api/axios-clients/fasteai/fasteaiAuth';
import type { ScheduleTask } from '../types/types';
import { triggerAndDownloadReport } from './trigger-and-download-report';

export const downloadLogs = async (item: ScheduleTask): Promise<void> => {
    try {
        const coreBase = appConfig.fasteai.api.coreBaseUrl;

        // 1. Ticket Audit: Download actual audit results CSV
        if (item.tower?.toLowerCase() === 'ticket audit') {
            try {
                const ok = await triggerAndDownloadReport(item, undefined, 'CSV');
                if (ok) return;
            } catch {
                // Silently swallow error to align with surrounding catch blocks
            }
        }

        if (item.status === 'Completed' && item.reportType?.toLowerCase() === 'self download') {
            try {
                const ok = await triggerAndDownloadReport(item);
                if (ok) return;
            } catch {}

            try {
                const access_token = await getValidToken();
                const incident = item.schedulePeriod?.incident_number;
                const candidateTaskIds = [incident, `SCHED-${item._id}`, item._id].filter(Boolean) as string[];
                for (const taskId of candidateTaskIds) {
                    const logsRes = await fetch(`${coreBase}/pretty_logs/${taskId}`, {
                        headers: { Authorization: `Bearer ${access_token}` },
                    });
                    if (logsRes.ok) {
                        const data = await logsRes.json();
                        const logContent = data.logs || JSON.stringify(data, null, 2);
                        const blob = new Blob([logContent], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${item.taskName}_${taskId}_report.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                        return;
                    }
                }
            } catch {}
        }

        if (['Triggered', 'Completed', 'Failed'].includes(item.status)) {
            const access_token = await getValidToken();
            const incident = item.schedulePeriod?.incident_number;
            const candidateTaskIds = [incident, `SCHED-${item._id}`, item._id].filter(Boolean) as string[];
            for (const taskId of candidateTaskIds) {
                const logsRes = await fetch(`${coreBase}/pretty_logs/${taskId}`, {
                    headers: { Authorization: `Bearer ${access_token}` },
                });
                if (logsRes.ok) {
                    const data = await logsRes.json();
                    const logContent = data.logs || 'No logs available';
                    const blob = new Blob([logContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${item.taskName}_${taskId}_logs.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    return;
                }
            }
        }

        const rows = [
            ['Task Name', 'Tower', 'SOP', 'Status', 'Report Type', 'Report Format', 'Ticket Required', 'CI Items', 'Start Date', 'Start Time'],
            [
                item.taskName,
                item.tower,
                item.sop,
                item.status,
                item.reportType,
                item.reportFormat,
                item.ticketRequired ? 'Yes' : 'No',
                (item.ciItems || []).join('; '),
                item.schedulePeriod?.startdata || '',
                item.schedulePeriod?.starttime || '',
            ],
        ];
        const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.taskName}_summary.csv`;
        a.click();
        URL.revokeObjectURL(url);
    } catch {}
};
