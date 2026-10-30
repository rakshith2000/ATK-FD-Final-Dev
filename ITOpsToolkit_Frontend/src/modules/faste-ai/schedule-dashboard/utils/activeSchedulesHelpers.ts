import type { LogMessage, ScheduleTask } from '../types/types';

export const AGENT_COLORS: Record<string, string> = {
    servicenow_agent: 'text-blue-700',
    master_agent: 'text-purple-700',
    code_developer_agent: 'text-emerald-700',
    knowledge_agent: 'text-amber-700',
    report_agent: 'text-pink-700',
    verification_agent: 'text-emerald-800',
    logging_agent: 'text-slate-600',
    summary_agent: 'text-orange-700',
};

export const agentColorClass = (src?: string) => AGENT_COLORS[(src || '').toLowerCase().replace(/\s+/g, '_')] || 'text-slate-400';

export const agentLabel = (src?: string) => (src || 'system').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export const formatLog = (log: LogMessage): string => {
    const c = log.content;
    if (c && typeof c === 'object') {
        const content = c as {
            duration?: number | string;
            total_tokens?: number | string;
            type?: string;
            selected_agent?: string;
            text?: string;
        };
        if (content.duration !== undefined && content.total_tokens !== undefined)
            return `Workflow completed in ${Math.round(Number(content.duration))}s — ${Number(content.total_tokens).toLocaleString()} tokens`;
        if (content.type === 'WorkflowComplete') return 'Workflow completed';
        if (content.selected_agent) return `Routing to: ${content.selected_agent}`;
        if (content.text) return String(content.text);
    }
    return log.message || '';
};

export const TERMINAL_RE =
    /task execution completed|task status updated to:\s*taskstatus\.(completed|failed|cancelled)|finished with status:\s*taskstatus\.(completed|failed|cancelled)/i;

export const ticketId = (t: ScheduleTask) => (t.ticketRequired && t.schedulePeriod?.incident_number ? t.schedulePeriod.incident_number : `SCHED-${t._id}`);
