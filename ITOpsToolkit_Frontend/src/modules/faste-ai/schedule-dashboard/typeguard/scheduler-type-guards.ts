import { z } from 'zod';
import type { Tower, TaskStatus, StepStatus, HealthStatus, SchedulePeriod, ScheduleTask, SopItem, CiItem, DashboardMetrics, DashboardData, ReportData } from '../types/types';

export const isString = (v: unknown): v is string => z.string().safeParse(v).success;

export const isNumber = (v: unknown): v is number => z.number().safeParse(v).success;

export const isBoolean = (v: unknown): v is boolean => z.boolean().safeParse(v).success;

export const isStringOrNullOrUndefined = (v: unknown): v is string | null | undefined => z.string().nullable().optional().safeParse(v).success;

export const isStringArray = (v: unknown): v is string[] => z.array(z.string()).safeParse(v).success;

export const isTower = (v: unknown): v is Tower => z.enum(['Windows', 'Linux', 'Database', 'Network']).safeParse(v).success;

export const isTaskStatus = (v: unknown): v is TaskStatus => z.enum(['Scheduled', 'Completed', 'Failed', 'Triggered', 'Awaiting']).safeParse(v).success;

export const isStepStatus = (v: unknown): v is StepStatus => z.enum(['SUCCESS', 'FAILED', 'PARTIAL_SUCCESS', 'SKIPPED']).safeParse(v).success;

export const isHealthStatus = (v: unknown): v is HealthStatus => z.enum(['SUCCESS', 'FAILED', 'HEALTHY', 'WARNING', 'CRITICAL', 'UNKNOWN', 'Ready']).safeParse(v).success;

const schedulePeriodSchema = z.object({
    startdata: z.string(),
    starttime: z.string(),
    enddate: z.string(),
    weekly: z.boolean(),
    weekday: z.string(),
    monthly: z.boolean(),
    recurrencedate: z.number(),
    weeknumber: z.number(),
    monthlyweekday: z.string(),
    incident_number: z.string().nullable().optional(),
    trigger_requested: z.boolean().optional(),
});

export const isSchedulePeriod = (value: unknown): value is SchedulePeriod => schedulePeriodSchema.safeParse(value).success;

const ciItemSchema = z.object({
    sys_id: z.string(),
    name: z.string(),
});

export const isCiItem = (value: unknown): value is CiItem => ciItemSchema.safeParse(value).success;

export const isCiItemArray = (value: unknown): value is CiItem[] => z.array(ciItemSchema).safeParse(value).success;

const sopItemSchema = z.object({
    id: z.union([z.string(), z.number()]),
    sop_name: z.string(),
    sop_content: z.string(),
    category: z.string().nullable().optional(),
    sop_type: z.string().nullable().optional(),
    u_sop_type: z.string().nullable().optional(),
    is_approved: z.string().nullable().optional(),
    created_by: z.string().nullable().optional(),
    created_on: z.string().nullable().optional(),
    last_observed_on: z.string().nullable().optional(),
});

export const isSopItem = (value: unknown): value is SopItem => sopItemSchema.safeParse(value).success;

export const isSopItemArray = (value: unknown): value is SopItem[] => z.array(sopItemSchema).safeParse(value).success;

const scheduleTaskSchema = z.object({
    _id: z.string(),
    taskName: z.string(),
    description: z.string(),
    tower: z.enum(['Windows', 'Linux', 'Database', 'Network']),
    sop: z.string(),
    reportType: z.string(),
    reportFormat: z.string(),
    ticketRequired: z.boolean(),
    ciItems: z.array(z.string()),
    status: z.enum(['Scheduled', 'Completed', 'Failed', 'Triggered', 'Awaiting']),
    schedulePeriod: z.union([schedulePeriodSchema, z.object({}).strict(), z.null(), z.undefined()]).optional(),
});

export const isScheduleTask = (value: unknown): value is ScheduleTask => scheduleTaskSchema.safeParse(value).success;

export const isScheduleTaskArray = (value: unknown): value is ScheduleTask[] => z.array(scheduleTaskSchema).safeParse(value).success;

const dashboardMetricsSchema = z.object({
    total: z.number(),
    scheduled: z.number(),
    completed: z.number(),
    failed: z.number(),
    triggered: z.number(),
    awaiting: z.number(),
    windows: z.number(),
    linux: z.number(),
    database: z.number(),
    network: z.number(),
});

export const isDashboardMetrics = (value: unknown): value is DashboardMetrics => dashboardMetricsSchema.safeParse(value).success;

const dashboardDataSchema = z.object({
    metrics: dashboardMetricsSchema,
    tasks: z.array(scheduleTaskSchema),
});

export const isDashboardData = (value: unknown): value is DashboardData => dashboardDataSchema.safeParse(value).success;

const reportDataSchema = z.object({
    task: z.object({
        taskName: z.string(),
        tower: z.enum(['Windows', 'Linux', 'Database', 'Network']),
        sop: z.string(),
        status: z.enum(['Scheduled', 'Completed', 'Failed', 'Triggered', 'Awaiting']),
        ticketRequired: z.boolean(),
        incidentNumber: z.string().nullable().optional(),
    }),
    summary: z.object({
        overall_status: z.enum(['SUCCESS', 'FAILED', 'HEALTHY', 'WARNING', 'CRITICAL', 'UNKNOWN', 'Ready']),
        total_cis: z.number(),
        total_steps: z.number(),
        steps_success: z.number(),
        steps_failed: z.number(),
        ci_rows: z.array(z.any()),
    }),
    ci_reports: z.array(z.any()),
    health_summaries: z.array(z.any()),
});

export const isReportData = (value: unknown): value is ReportData => reportDataSchema.safeParse(value).success;
