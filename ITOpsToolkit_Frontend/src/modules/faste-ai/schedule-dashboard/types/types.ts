export const TOWERS = ['Windows', 'Linux', 'Database', 'Network', 'Ticket Audit'] as const;
export type Tower = (typeof TOWERS)[number];

export const TASK_STATUSES = ['Scheduled', 'Completed', 'Failed', 'Triggered', 'Awaiting'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type StepStatus = 'SUCCESS' | 'FAILED' | 'PARTIAL_SUCCESS' | 'SKIPPED';
export type HealthStatus = 'SUCCESS' | 'FAILED' | 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';

export interface ApiError extends Error {
    status?: number;
}

export interface LogMessage {
    time?: string;
    message?: string;
    agent_name?: string;
    source?: string;
    content?: {
        text?: string;
        duration?: number | string;
        total_tokens?: number | string;
        type?: string;
        selected_agent?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export type ScheduleState = {
    filterKey: string;
    filterValue: string;
    tasks: ScheduleTask[];
};

export interface SchedulePeriod {
    startdata: string;
    starttime: string;
    enddate: string;
    daily?: boolean;
    weekly: boolean;
    weekday: string;
    monthly: boolean;
    recurrencedate: number;
    weeknumber: number;
    monthlyweekday: string;
    interval?: number;
    recurrenceInterval?: number;
    last_run_date?: string;
    incident_number?: string;
    trigger_requested?: boolean;
}

export interface FormData {
    taskName: string;
    description: string;
    tower: Tower;
    sop: string;
    ciItems: string[];
    reportType: string;
    reportFormat: string;
    ticketRequired: boolean;
    schedulePeriod: SchedulePeriod;
    status: TaskStatus;
}

export type CreateTaskPayload = FormData;

export interface Errors {
    taskName?: string;
    description?: string;
    tower?: string;
    sop?: string;
    ciItems?: string;
    reportType?: string;
    reportFormat?: string;
}

export interface SopItem {
    id: string | number;
    sop_name: string;
    sop_content: string;
    category?: string;
    sop_type?: string | null;
    u_sop_type?: string | null;
    is_approved?: string;
    created_by?: string;
    created_on?: string;
    last_observed_on?: string;
}

export interface CiItem {
    sys_id: string;
    name: string;
}

export interface ScheduleTask {
    _id: string;
    taskName: string;
    description: string;
    tower: Tower;
    sop: string;
    reportType: string;
    reportFormat: string;
    ticketRequired: boolean;
    ciItems: string[];
    status: TaskStatus;
    schedulePeriod?: Partial<SchedulePeriod>;
}

export interface DashboardMetrics {
    total: number;
    scheduled: number;
    completed: number;
    failed: number;
    triggered: number;
    awaiting: number;
    windows: number;
    linux: number;
    database: number;
    network: number;
    ticketAudit: number;
}

export interface DashboardData {
    metrics: DashboardMetrics;
    tasks: ScheduleTask[];
}

export interface StepData {
    step_number: string;
    title: string;
    status: StepStatus;
    commands: string;
    output: string;
}

export interface CiReport {
    ci_name: string;
    ci_sys_id: string;
    resolved_ip: string;
    status: HealthStatus;
    steps: StepData[];
}

export interface ReportSummary {
    overall_status: HealthStatus;
    total_cis: number;
    total_steps: number;
    steps_success: number;
    steps_failed: number;
    ci_rows: [string, string, string, HealthStatus, number][];
}

export interface HealthSummaryItem {
    metricName: string;
    score: number;
    details?: string;
}

export interface ReportData {
    task: {
        taskName: string;
        tower: Tower;
        sop: string;
        status: TaskStatus;
        ticketRequired: boolean;
        incidentNumber: string;
    };
    summary: ReportSummary;
    ci_reports: CiReport[];
    health_summaries: HealthSummaryItem[];
}
