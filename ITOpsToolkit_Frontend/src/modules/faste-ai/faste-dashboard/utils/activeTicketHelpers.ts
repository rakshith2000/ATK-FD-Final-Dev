import type { LogMessage } from '@/modules/faste-ai/schedule-dashboard/types/types';

export type LiveLogFrame = LogMessage;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const toNumber = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};
export const toLiveLogFrame = (value: unknown): LiveLogFrame | null => {
    if (!isRecord(value)) return null;
    const contentText = typeof value.content === 'string' ? value.content : undefined;
    const content = isRecord(value.content) ? (value.content as LiveLogFrame['content']) : contentText ? { text: contentText } : undefined;
    return {
        ...value,
        time: typeof value.time === 'string' ? value.time : undefined,
        source: typeof value.source === 'string' ? value.source : typeof value.agent_name === 'string' ? value.agent_name : undefined,
        message: typeof value.message === 'string' ? value.message : contentText,
        content,
    };
};

export const extractLogs = (payload: unknown): LiveLogFrame[] => {
    const list = Array.isArray(payload) ? payload : isRecord(payload) ? (payload.logs ?? payload.data ?? payload.result) : undefined;
    if (!Array.isArray(list)) return [];
    return list.map(toLiveLogFrame).filter((log): log is LiveLogFrame => log !== null);
};

export const logKey = (log: LiveLogFrame): string => `${log.time ?? ''}|${log.source ?? ''}|${log.message ?? log.content?.text ?? ''}`;

// The backend writes log times as UTC "YYYY-MM-DD HH:MM:SS" (time.gmtime()) with no zone marker;
// parsing that as-is would read it as local time and skew the running timer by the UTC offset.
export const parseLogTime = (value?: string): number | null => {
    if (!value) return null;
    const naiveUtc = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value.trim());
    const t = new Date(naiveUtc ? `${value.trim().replace(' ', 'T')}Z` : value).getTime();
    return Number.isNaN(t) ? null : t;
};

const frameText = (log: LiveLogFrame): string => String(log.message ?? log.content?.text ?? '');

const isCompletionContent = (content: LiveLogFrame['content']): boolean => content?.duration !== undefined && content?.total_tokens !== undefined;

export const isCompletionFrame = (log: LiveLogFrame): boolean => {
    const msg = frameText(log);
    return (
        isCompletionContent(log.content) ||
        log.content?.type === 'WorkflowComplete' ||
        msg.includes('Task completed') ||
        msg.includes('TERMINATE') ||
        msg.includes('finished with status')
    );
};

// Per-step usage: agent run frames carry content.tokens = { input, output, total } (fasteai-core _extract_agent_response).
// Run totals (content.total_tokens / content.token_summary) are not counted here to avoid double counting.
export const getFrameTokens = (log: LiveLogFrame): number => {
    const content = log.content;
    const stepTokens = content?.tokens;
    if (isRecord(stepTokens)) {
        if (stepTokens.total !== undefined && stepTokens.total !== null) return toNumber(stepTokens.total);
        return toNumber(stepTokens.input) + toNumber(stepTokens.output);
    }
    const usage = [log.models_usage, log.usage, content?.models_usage, content?.usage].find(isRecord);
    if (!usage) return 0;
    if (usage.total_tokens !== undefined) return toNumber(usage.total_tokens);
    if (usage.total_token_count !== undefined) return toNumber(usage.total_token_count);
    return toNumber(usage.prompt_tokens) + toNumber(usage.completion_tokens);
};

const parseSeconds = (value: unknown): number | null => {
    if (value === undefined || value === null) return null;
    const n = parseFloat(String(value)); // backend sends "12.34 seconds"
    return Number.isNaN(n) ? null : n;
};

// WorkflowSummary carries content.total_tokens + duration; FinalResult (WorkflowComplete) carries duration and optional token_summary.
export const finalCompletionFromLogs = (logs: LiveLogFrame[]): { durationSeconds: number | null; totalTokens: number | null } => {
    let durationSeconds: number | null = null;
    let totalTokens: number | null = null;
    for (let i = logs.length - 1; i >= 0 && (durationSeconds === null || totalTokens === null); i--) {
        const content = logs[i].content;
        if (!content) continue;
        const summary = isRecord(content.token_summary) ? content.token_summary : undefined;
        if (totalTokens === null) {
            if (content.total_tokens !== undefined) totalTokens = toNumber(content.total_tokens);
            else if (summary?.total_tokens !== undefined) totalTokens = toNumber(summary.total_tokens);
        }
        if (durationSeconds === null && (isCompletionContent(content) || content.type === 'WorkflowComplete')) {
            durationSeconds = parseSeconds(content.duration) ?? parseSeconds(summary?.duration);
        }
    }
    return { durationSeconds, totalTokens };
};

export const deriveTokensFromLogs = (logs: LiveLogFrame[]): number => {
    const { totalTokens } = finalCompletionFromLogs(logs);
    const stepSum = logs.reduce((sum, log) => sum + getFrameTokens(log), 0);
    return Math.max(totalTokens ?? 0, stepSum);
};

export const firstLogTime = (logs: LiveLogFrame[]): number | null => {
    let earliest: number | null = null;
    for (const log of logs) {
        const t = parseLogTime(log.time);
        if (t !== null && (earliest === null || t < earliest)) earliest = t;
    }
    return earliest;
};

const VERIFICATION_AGENT_RE = /verification[\s_-]?agent/i;

export const hasVerificationAgent = (logs: LiveLogFrame[]): boolean =>
    logs.some((log) =>
        [log.source, log.agent_name, log.content?.selected_agent, log.message, log.content?.text].some((value) => typeof value === 'string' && VERIFICATION_AGENT_RE.test(value)),
    );

export const progressFromElapsed = (seconds: number): number => {
    if (seconds > 60) return 70;
    if (seconds >= 50) return 60;
    if (seconds >= 45) return 50;
    if (seconds >= 30) return 30;
    if (seconds >= 20) return 15;
    return 5;
};

export const computeTicketProgress = ({ elapsedSeconds, logs, isFinished }: { elapsedSeconds: number; logs: LiveLogFrame[]; isFinished: boolean }): number => {
    if (isFinished) return 100;
    if (hasVerificationAgent(logs)) return 90;
    return progressFromElapsed(elapsedSeconds);
};

export const formatDuration = (seconds?: number | null): string => {
    if (seconds === undefined || seconds === null || !Number.isFinite(seconds)) return 'NA';
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(Math.floor(totalSeconds / 3600))}:${pad(Math.floor((totalSeconds % 3600) / 60))}:${pad(totalSeconds % 60)}`;
};

export const getCurrentStatus = (logs: LiveLogFrame[]): string => {
    if (logs.length === 0) return 'Waiting for agent assignment...';
    const latestLog = logs[logs.length - 1];
    if (isCompletionFrame(latestLog)) return 'Task completed successfully';
    const latestText = latestLog.message ?? latestLog.content?.text;
    if (latestText?.includes('completed')) return 'Task completed successfully';
    if (latestText?.includes('failed') || latestText?.includes('error')) return 'Task failed - investigating';
    if (latestText?.includes('Step') && latestText.includes(':')) {
        const stepMatch = latestText.match(/Step \d+[^:]*:?\s*(.+)/);
        if (stepMatch) return `Executing: ${stepMatch[1].substring(0, 40)}...`;
    }
    return `${latestText?.substring(0, 45) ?? 'Processing'}...`;
};

export const normalizeFieldValue = (val: unknown): string => {
    if (val === null || val === undefined) return 'NA';
    if (typeof val === 'string') return val.trim() !== '' ? val.trim() : 'NA';
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (Array.isArray(val)) {
        const flattened = val.map((item) => normalizeFieldValue(item)).filter((item) => item !== 'NA');
        return flattened.length > 0 ? flattened.join(', ') : 'NA';
    }
    if (isRecord(val)) {
        const nestedCandidates = [val.display_value, val.displayValue, val.value, val.name, val.label, val.title, val.sys_name, val.link];
        for (const candidate of nestedCandidates) {
            const normalized = normalizeFieldValue(candidate);
            if (normalized !== 'NA') return normalized;
        }
        const fallbackEntries = Object.values(val)
            .map((entry) => normalizeFieldValue(entry))
            .filter((entry) => entry !== 'NA');
        return fallbackEntries.length > 0 ? fallbackEntries.join(', ') : 'NA';
    }
    return String(val);
};

export const resolveIncidentValue = (record: Record<string, unknown>, keys: string[]): string => {
    for (const key of keys) {
        const normalized = normalizeFieldValue(record[key]);
        if (normalized !== 'NA') return normalized;
    }
    for (const [candidateKey, candidateValue] of Object.entries(record)) {
        const normalizedKey = candidateKey.toLowerCase();
        if (keys.some((key) => normalizedKey.includes(key.toLowerCase()))) {
            const normalized = normalizeFieldValue(candidateValue);
            if (normalized !== 'NA') return normalized;
        }
    }
    return 'NA';
};

// ---------- Ticket fields reported by the agents ----------

export const TICKET_DETAIL_FIELDS = ['short_description', 'description', 'priority', 'assigned_to', 'assignment_group', 'cmdb_ci', 'created_on'] as const;
export type TicketDetailField = (typeof TICKET_DETAIL_FIELDS)[number];

const FIELD_ALIASES: Record<TicketDetailField, string[]> = {
    short_description: ['short_description', 'shortdescription'],
    description: ['description'],
    priority: ['priority'],
    assigned_to: ['assigned_to', 'assignedto'],
    assignment_group: ['assignment_group', 'assignmentgroup'],
    cmdb_ci: ['cmdb_ci', 'cmdbci', 'configuration_item'],
    created_on: ['sys_created_on', 'created_on', 'opened_at'],
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Matches `"key": "value"` / `'key': 'value'` and `"key": {"display_value": "value", ...}` inside JSON or python-dict text.
const findInText = (text: string, alias: string): string | null => {
    const key = `["']${escapeRe(alias)}["']\\s*:\\s*`;
    const nested = new RegExp(`${key}\\{[^}]*?["']display_value["']\\s*:\\s*["']([^"']+)["']`).exec(text);
    if (nested?.[1]?.trim()) return nested[1].trim();
    const flat = new RegExp(`${key}["']([^"']+)["']`).exec(text);
    if (flat?.[1]?.trim()) return flat[1].trim();
    const numeric = new RegExp(`${key}(\\d+)`).exec(text);
    return numeric?.[1] ?? null;
};

const findInObject = (obj: unknown, alias: string, depth = 0): string | null => {
    if (depth > 5 || obj === null || typeof obj !== 'object') return null;
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const found = findInObject(item, alias, depth + 1);
            if (found) return found;
        }
        return null;
    }
    const record = obj as Record<string, unknown>;
    if (alias in record) {
        const normalized = normalizeFieldValue(record[alias]);
        if (normalized !== 'NA') return normalized;
    }
    for (const value of Object.values(record)) {
        const found = typeof value === 'string' ? findInText(value, alias) : findInObject(value, alias, depth + 1);
        if (found) return found;
    }
    return null;
};

// The ServiceNow agent fetches the incident at the start of a run; pull the ticket fields from those frames.
export const extractTicketFieldsFromLogs = (logs: LiveLogFrame[]): Partial<Record<TicketDetailField, string>> => {
    const ordered = [...logs.filter((l) => /servicenow/i.test(l.source ?? '')), ...logs.filter((l) => !/servicenow/i.test(l.source ?? ''))];
    const result: Partial<Record<TicketDetailField, string>> = {};
    for (const field of TICKET_DETAIL_FIELDS) {
        for (const log of ordered) {
            const { time: _time, source: _source, ...payload } = log;
            let found: string | null = null;
            for (const alias of FIELD_ALIASES[field]) {
                found = findInObject(payload, alias);
                if (found) break;
            }
            if (found) {
                result[field] = found;
                break;
            }
        }
    }
    return result;
};

// Fills empty / NA fields on a ticket from other sources without overwriting real values.
export const mergeTicketFields = <T extends Record<string, unknown>>(base: T, ...sources: Array<Record<string, unknown> | undefined>): T => {
    const merged: Record<string, unknown> = { ...base };
    for (const source of sources) {
        if (!source) continue;
        for (const [key, value] of Object.entries(source)) {
            if (normalizeFieldValue(merged[key]) === 'NA' && normalizeFieldValue(value) !== 'NA') merged[key] = value;
        }
    }
    return merged as T;
};

export const downloadLogsAsText = (incidentId: string, logs: LiveLogFrame[]) => {
    const logText = logs.map((l) => `[${l.time ?? ''}] [${l.source ?? 'Agent'}] ${l.message ?? l.content?.text ?? ''}`).join('\n\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${incidentId}_operation_logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
