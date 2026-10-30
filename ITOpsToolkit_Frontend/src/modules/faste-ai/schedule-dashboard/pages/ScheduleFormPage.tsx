import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm, useStore } from '@tanstack/react-form';
import { Check, Save, Trash2, Eye } from 'lucide-react';
import z from 'zod';

import { resolveFieldDisabled, type FieldDisableInfo } from '@/shared/utils/resolve-field-disabled';
import { FormField, TextInput, SelectInput, MultiSelectInput, type SelectOption } from '@/shared/components/ui/InputFields';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import type { FormMode } from '@/shared/types/form';
import type { OverlayState } from '@/shared/components/ui/FormActionModal/FormActionModal';

import { useScheduleFormQuery } from '../hooks/useScheduleForm';
import type { Tower, FormData as SDKFormData, SchedulePeriod } from '../types/types';

import { SopModal } from '../components/ui/SopModal/SopModal';
import { RecurrenceModal } from '../components/ui/RecurrenceModal/RecurrenceModal';
import { SchedulePeriodSection } from '../components/ui/SchedulePeriodSection/SchedulePeriodSection';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

interface ScheduleFormPageProps {
    mode?: FormMode;
    initialValues?: Partial<LocalFormValues>;
    onSubmitSuccess?: (data: { formDataWhileSubmitting: LocalFormValues; message: string }) => Promise<void>;
    isFieldDisabled?: (info: FieldDisableInfo<FormMode>) => boolean | undefined;
    setOverlay?: (state: OverlayState) => void;
    setCanClose?: (canClose: boolean) => void;
}

interface LocalFormValues {
    [key: string]: unknown;
    taskName: string;
    description: string;
    tower: string;
    sop: string;
    ciItems: string[];
    reportType: string;
    reportFormat: string;
    ticketRequired: boolean;
    status: string;
    schedulePeriod?: Partial<SchedulePeriod>;
}

const labelClassName = 'text-[0.7rem] 2xl:text-xs font-bold text-(--ticket-title-color) block mb-1 2xl:mb-1.5';

const scheduleFormSchema = z
    .object({
        taskName: z.string().min(1, 'Task Name is required'),
        description: z.string(),
        tower: z.string().min(1, 'Tower is required'),
        sop: z.string().min(1, 'SOP is required'),
        ciItems: z.array(z.string()),
        reportType: z.string().min(1, 'Report Type is required'),
        reportFormat: z.string().min(1, 'Report Format is required'),
        ticketRequired: z.boolean(),
        status: z.string(),
        schedulePeriod: z
            .object({
                startdata: z.string().min(1, 'Start Date is required'),
                enddate: z.string().optional(),
            })
            .refine(
                (data) => {
                    if (data.startdata && data.enddate) {
                        return new Date(data.enddate) >= new Date(data.startdata);
                    }
                    return true;
                },
                {
                    message: 'End Date must be on or after Start Date',
                    path: ['enddate'],
                },
            )
            .optional(),
    })
    .superRefine((data, ctx) => {
        if (data.tower !== 'Ticket Audit' && data.ciItems.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'At least one CI is required',
                path: ['ciItems'],
            });
        }
    });

const submitConfig: Record<FormMode, { label: string; submittingLabel: string; icon?: React.ReactNode; className?: string }> = {
    create: { label: 'Submit', submittingLabel: 'Submitting...', className: 'px-8 py-2 rounded-full font-bold text-xs bg-[#011a80] text-white shadow-sm min-w-[110px]' },
    update: {
        label: 'Update',
        submittingLabel: 'Updating...',
        icon: <Save size={14} />,
        className: 'px-8 py-2 rounded-full font-bold text-xs bg-[#011a80] text-white shadow-sm min-w-[110px]',
    },
    delete: {
        label: 'Delete',
        submittingLabel: 'Deleting...',
        icon: <Trash2 size={14} />,
        className: 'px-8 py-2 rounded-full font-bold text-xs bg-red-600 text-white shadow-sm min-w-[110px]',
    },
    view: {
        label: 'Close',
        submittingLabel: 'Close',
        icon: <Eye size={14} />,
        className: 'px-8 py-2 rounded-full font-bold text-xs bg-slate-200 text-slate-800 shadow-sm min-w-[110px]',
    },
};

export const ScheduleFormPage: React.FC<ScheduleFormPageProps> = ({ mode = 'create', initialValues, onSubmitSuccess, isFieldDisabled, setOverlay, setCanClose }) => {
    const navigate = useNavigate();
    const { sops, isLoadingSops, sopError, refetchSops, cis, createTaskMutation } = useScheduleFormQuery();

    const [showSopModal, setShowSopModal] = useState(false);
    const [currentSopDetails, setCurrentSopDetails] = useState<{ name: string; content: string } | null>(null);
    const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);

    const sp = initialValues?.schedulePeriod || {};

    const [scheduleStartDate, setScheduleStartDate] = useState<string>(() => sp.startdata || new Date().toISOString().split('T')[0]);
    const [scheduleStartTime, setScheduleStartTime] = useState<string>(() => sp.starttime?.slice(0, 5) || new Date().toTimeString().slice(0, 5));
    const [scheduleEndDate, setScheduleEndDate] = useState<string>(() => sp.enddate || '');

    const [recurrenceEnabled, setRecurrenceEnabled] = useState<boolean>(() => !!(sp.daily || sp.weekly || sp.monthly));
    const [recurrencePattern, setRecurrencePattern] = useState<string>(() => (sp.daily ? 'Daily' : sp.weekly ? 'Weekly' : sp.monthly ? 'Monthly' : 'Daily'));
    const [recurrenceInterval, setRecurrenceInterval] = useState<number>(() => sp.interval || sp.recurrenceInterval || 1);
    const [recurrenceWeekDays, setRecurrenceWeekDays] = useState<string[]>([new Date().getDay().toString()]);

    const [monthlyType, setMonthlyType] = useState<'DayOfMonth' | 'DayOfWeek'>('DayOfMonth');
    const [monthlyDay, setMonthlyDay] = useState(sp.recurrencedate || new Date().getDate());
    const [monthlyWeek, setMonthlyWeek] = useState<'First' | 'Second' | 'Third' | 'Fourth' | 'Last'>('First');
    const [monthlyWeekDay, setMonthlyWeekDay] = useState(new Date().getDay().toString());

    const containerRef = useRef<HTMLDivElement>(null);

    const handleStartDateChange = (newStartDate: string) => {
        setScheduleStartDate(newStartDate);
        if (scheduleEndDate && newStartDate > scheduleEndDate) {
            setScheduleEndDate(newStartDate);
        }
    };

    const defaultFormValues: LocalFormValues = {
        taskName: initialValues?.taskName ?? '',
        description: initialValues?.description ?? '',
        tower: initialValues?.tower ?? '',
        sop: initialValues?.sop ?? '',
        ciItems: initialValues?.ciItems ?? [],
        reportType: initialValues?.reportType ?? 'Self download',
        reportFormat: initialValues?.reportFormat ?? 'PDF',
        ticketRequired: initialValues?.ticketRequired ?? false,
        status: initialValues?.status ?? 'Scheduled',
    };

    const formInstance = useForm({
        defaultValues: defaultFormValues,
        validators: {
            onSubmit: ['create', 'update'].includes(mode) ? scheduleFormSchema : undefined,
            onChange: ['create', 'update'].includes(mode) ? scheduleFormSchema : undefined,
        },
        onSubmit: async ({ value }) => {
            const parsedWeekDayIndex = parseInt(recurrenceWeekDays[0], 10);
            const parsedMonthlyWeekDayIndex = parseInt(monthlyWeekDay, 10);

            const isTicketAudit = value.tower === 'Ticket Audit';
            let effectiveStartDate = scheduleStartDate;
            let effectiveStartTime = scheduleStartTime.length === 5 ? scheduleStartTime + ':00' : scheduleStartTime;

            if (isTicketAudit) {
                const now = new Date();
                const triggerDate = new Date(now.getTime() + 5 * 60 * 1000);
                const hh = String(triggerDate.getHours()).padStart(2, '0');
                const mm = String(triggerDate.getMinutes()).padStart(2, '0');
                const ss = String(triggerDate.getSeconds()).padStart(2, '0');
                effectiveStartTime = `${hh}:${mm}:${ss}`;

                const yyyy = triggerDate.getFullYear();
                const month = String(triggerDate.getMonth() + 1).padStart(2, '0');
                const dd = String(triggerDate.getDate()).padStart(2, '0');
                const triggerDateStr = `${yyyy}-${month}-${dd}`;

                if (!effectiveStartDate || effectiveStartDate < triggerDateStr) {
                    effectiveStartDate = triggerDateStr;
                }
            }

            const payload = {
                taskName: value.taskName ?? '',
                description: value.description ?? '',
                tower: (value.tower ?? '') as unknown as Tower,
                sop: value.sop ?? '',
                ciItems: isTicketAudit ? [] : (value.ciItems ?? []),
                reportType: value.reportType ?? '',
                reportFormat: value.reportFormat ?? '',
                ticketRequired: isTicketAudit ? false : !!value.ticketRequired,
                schedulePeriod: {
                    startdata: effectiveStartDate,
                    starttime: effectiveStartTime,
                    enddate: scheduleEndDate || '',
                    daily: recurrenceEnabled && recurrencePattern === 'Daily',
                    weekly: recurrenceEnabled && recurrencePattern === 'Weekly',
                    weekday: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][parsedWeekDayIndex === 0 ? 6 : parsedWeekDayIndex - 1] || 'monday',
                    monthly: recurrenceEnabled && recurrencePattern === 'Monthly',
                    recurrencedate: monthlyDay,
                    weeknumber: ['First', 'Second', 'Third', 'Fourth', 'Last'].indexOf(monthlyWeek),
                    monthlyweekday:
                        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][parsedMonthlyWeekDayIndex === 0 ? 6 : parsedMonthlyWeekDayIndex - 1] ||
                        'monday',
                    interval: recurrenceInterval,
                    recurrenceInterval: recurrenceInterval,
                },
                status: 'Scheduled' as const,
            };

            const response = await createTaskMutation.mutateAsync(payload as unknown as SDKFormData);
            const defaultMessage = isRecord(response) && typeof response.message === 'string' ? response.message : 'Task successfully scheduled';
            const successNote = isTicketAudit
                ? 'Ticket Audit task scheduled successfully! Execution will automatically start in 5 minutes.'
                : defaultMessage || 'Task Group submitted successfully!';

            if (onSubmitSuccess) {
                await onSubmitSuccess({
                    formDataWhileSubmitting: value as LocalFormValues,
                    message: successNote,
                });
            } else {
                setSubmitSuccess(true);
                setSubmitSuccessMessage(successNote);
                if (containerRef.current) {
                    containerRef.current.scrollTop = 0;
                }
            }

            formInstance.reset();
        },
    });

    const selectedTower = useStore(formInstance.store, (s) => s.values.tower) as string;
    const isSubmissionInProgress = useStore(formInstance.store, (s) => s.isSubmitting);

    const getDisabled = useCallback(
        (fieldName: string, value: unknown, canEdit?: boolean) =>
            resolveFieldDisabled<FormMode>({
                fieldName,
                mode,
                value,
                canEdit,
                isSubmissionInProgress,
                isFieldDisabled,
            }),
        [mode, isSubmissionInProgress, isFieldDisabled],
    );

    useEffect(() => {
        setOverlay?.({
            isLoading: isSubmissionInProgress,
            isError: !!sopError,
            error: sopError ? new Error(sopError) : null,
            onRetry: refetchSops,
        });
        setCanClose?.(!isSubmissionInProgress);
    }, [isSubmissionInProgress, sopError, refetchSops, setOverlay, setCanClose]);

    const { label, submittingLabel, icon, className: submitClassName } = submitConfig[mode];

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
            { label: 'Ticket Audit Table', value: 'Ticket Audit Table' },
        ],
        [],
    );

    const mappedSopOptions: SelectOption[] = useMemo(() => {
        return (sops || [])
            .filter((s) => {
                const typeStr = (s.u_sop_type || '').toLowerCase().replace('_', ' ');
                return typeStr === 'schedule based';
            })
            .map((s) => ({ label: s.sop_name, value: s.sop_name }));
    }, [sops]);

    const mappedCiOptions: SelectOption[] = useMemo(() => {
        let list = cis || [];
        if (selectedTower) {
            list = list.filter((ci) => ci.name.toLowerCase().includes(selectedTower.toLowerCase()));
        }
        return list.map((c) => ({ label: c.name, value: c.sys_id }));
    }, [cis, selectedTower]);

    return (
        <div ref={containerRef} className="h-screen w-full bg-[#f8faff] text-slate-800 flex flex-col overflow-y-auto pb-12 p-6 scrollbar-thin">
            <div className="max-w-[1600px] w-full mx-auto space-y-6">
                {submitSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-700 font-bold text-xs p-4 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
                        <Check size={16} className="shrink-0 text-green-600" />
                        <span>{submitSuccessMessage || 'Task Group submitted successfully!'}</span>
                    </div>
                )}

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        formInstance.handleSubmit();
                    }}
                    className="bg-white border border-[#E0EAFF] shadow-[inset_0px_0px_20px_0px_#A4D1FF] px-10 py-8 max-w-350 mx-auto my-2.5 mb-16 text-[#011A80] flex flex-col"
                    style={{ borderRadius: '20px' }}
                >
                    <div className="border-b border-slate-100 pb-4 mb-6">
                        <h1 className="text-[17px] font-extrabold tracking-tight text-[#011A80]">New Task Scheduler</h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5 flex-1">
                        <div className="space-y-5">
                            <formInstance.Field name="taskName">
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="Task Name:"
                                        required
                                        labelClassName={labelClassName}
                                        errorMinHeight={0}
                                        disabled={getDisabled('taskName', field.state.value, mode === 'create' || mode === 'update')}
                                    >
                                        {({ inputClassName }) => (
                                            <TextInput
                                                value={(field.state.value as string) ?? ''}
                                                onChange={(v) => field.handleChange(v)}
                                                onBlur={field.handleBlur}
                                                disabled={getDisabled('taskName', field.state.value, mode === 'create' || mode === 'update')}
                                                className={inputClassName}
                                                data-field="taskName"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>

                            <formInstance.Field name="tower">
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="Tower:"
                                        required
                                        labelClassName={labelClassName}
                                        errorMinHeight={0}
                                        disabled={getDisabled('tower', field.state.value, mode === 'create' || mode === 'update')}
                                    >
                                        {() => (
                                            <SelectInput
                                                value={(field.state.value as string) ?? ''}
                                                options={towerOptions}
                                                placeholder="Select Tower"
                                                disabled={getDisabled('tower', field.state.value, mode === 'create' || mode === 'update')}
                                                onChange={(v) => {
                                                    field.handleChange(v);
                                                    formInstance.setFieldValue('ciItems', []);
                                                    if (v === 'Ticket Audit') {
                                                        formInstance.setFieldValue('reportType', 'Database');
                                                        formInstance.setFieldValue('reportFormat', 'Ticket Audit Table');
                                                        // Ticket Audit never uses a ServiceNow ticket.
                                                        formInstance.setFieldValue('ticketRequired', false);
                                                    } else {
                                                        const currentReportType = formInstance.getFieldValue('reportType');
                                                        const currentReportFormat = formInstance.getFieldValue('reportFormat') as string;
                                                        if (currentReportType === 'Database') {
                                                            formInstance.setFieldValue('reportType', 'Self download');
                                                        }
                                                        if (currentReportFormat === 'Ticket Audit Table' || currentReportFormat === 'incident_master_table') {
                                                            formInstance.setFieldValue('reportFormat', 'PDF');
                                                        }
                                                    }
                                                }}
                                                onBlur={field.handleBlur}
                                                data-field="tower"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>

                            <formInstance.Field name="reportType">
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="Report Type:"
                                        labelClassName={labelClassName}
                                        errorMinHeight={0}
                                        disabled={getDisabled('reportType', field.state.value, mode === 'create' || mode === 'update') || selectedTower === 'Ticket Audit'}
                                    >
                                        {() => (
                                            <SelectInput
                                                value={(field.state.value as string) ?? ''}
                                                options={reportTypeOptions}
                                                placeholder="Select Type"
                                                disabled={getDisabled('reportType', field.state.value, mode === 'create' || mode === 'update') || selectedTower === 'Ticket Audit'}
                                                onChange={(v) => {
                                                    field.handleChange(v);
                                                    if (v === 'Database') {
                                                        formInstance.setFieldValue('tower', 'Ticket Audit');
                                                        formInstance.setFieldValue('reportFormat', 'Ticket Audit Table');
                                                        formInstance.setFieldValue('ticketRequired', false);
                                                        formInstance.setFieldValue('ciItems', []);
                                                    }
                                                }}
                                                onBlur={field.handleBlur}
                                                data-field="reportType"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>

                            <formInstance.Field name="ciItems">
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="Configuration Items:"
                                        required={selectedTower !== 'Ticket Audit'}
                                        labelClassName={labelClassName}
                                        errorMinHeight={0}
                                        disabled={
                                            getDisabled('ciItems', field.state.value, mode === 'create' || mode === 'update') || !selectedTower || selectedTower === 'Ticket Audit'
                                        }
                                    >
                                        {() => (
                                            <MultiSelectInput
                                                value={(field.state.value as string[]) ?? []}
                                                options={mappedCiOptions}
                                                placeholder={selectedTower ? `Search ${selectedTower} CIs...` : 'Select Tower First...'}
                                                disabled={
                                                    getDisabled('ciItems', field.state.value, mode === 'create' || mode === 'update') ||
                                                    !selectedTower ||
                                                    selectedTower === 'Ticket Audit'
                                                }
                                                onChange={(v) => field.handleChange(v)}
                                                onBlur={field.handleBlur}
                                                data-field="ciItems"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>

                            <formInstance.Field name="ticketRequired">
                                {(field) => (
                                    <FormField field={field} variant="standard" label="Ticket Required:" labelClassName={labelClassName} errorMinHeight={0}>
                                        {() => (
                                            <div className="flex gap-6 py-1 items-center">
                                                {[true, false].map((val) => (
                                                    <label key={val.toString()} className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                                                        <input
                                                            type="radio"
                                                            name="ticketRequired"
                                                            checked={field.state.value === val}
                                                            disabled={
                                                                getDisabled('ticketRequired', field.state.value, mode === 'create' || mode === 'update') ||
                                                                selectedTower === 'Ticket Audit'
                                                            }
                                                            onChange={() => field.handleChange(val)}
                                                            className="w-3.5 h-3.5 text-blue-950 focus:ring-blue-500 border-slate-300 disabled:opacity-50"
                                                        />
                                                        <span>{val ? 'Yes' : 'No'}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>
                        </div>

                        <div className="space-y-5">
                            <formInstance.Field name="description">
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="Description:"
                                        labelClassName={labelClassName}
                                        errorMinHeight={0}
                                        disabled={getDisabled('description', field.state.value, mode === 'create' || mode === 'update')}
                                    >
                                        {({ inputClassName }) => (
                                            <TextInput
                                                value={(field.state.value as string) ?? ''}
                                                onChange={(v) => field.handleChange(v)}
                                                onBlur={field.handleBlur}
                                                disabled={getDisabled('description', field.state.value, mode === 'create' || mode === 'update')}
                                                className={inputClassName}
                                                data-field="description"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>

                            <formInstance.Field name="sop">
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="SOP:"
                                        required
                                        labelClassName={labelClassName}
                                        errorMinHeight={0}
                                        disabled={getDisabled('sop', field.state.value, mode === 'create' || mode === 'update')}
                                    >
                                        {() => (
                                            <SelectInput
                                                value={(field.state.value as string) ?? ''}
                                                options={mappedSopOptions}
                                                isLoading={isLoadingSops}
                                                errorMessage={sopError ?? undefined}
                                                placeholder="Select SOP"
                                                disabled={getDisabled('sop', field.state.value, mode === 'create' || mode === 'update')}
                                                onRetry={refetchSops}
                                                onChange={(v) => {
                                                    field.handleChange(v);
                                                    const matchingSop = sops?.find((s) => s.sop_name === v);
                                                    if (matchingSop) {
                                                        setCurrentSopDetails({ name: matchingSop.sop_name, content: matchingSop.sop_content });
                                                        setShowSopModal(true);
                                                    }
                                                }}
                                                onBlur={field.handleBlur}
                                                data-field="sop"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>

                            <formInstance.Field name="reportFormat">
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="Report Format:"
                                        labelClassName={labelClassName}
                                        errorMinHeight={0}
                                        disabled={getDisabled('reportFormat', field.state.value, mode === 'create' || mode === 'update') || selectedTower === 'Ticket Audit'}
                                    >
                                        {() => (
                                            <SelectInput
                                                value={(field.state.value as string) ?? ''}
                                                options={reportFormatOptions}
                                                placeholder="Select Format"
                                                disabled={
                                                    getDisabled('reportFormat', field.state.value, mode === 'create' || mode === 'update') || selectedTower === 'Ticket Audit'
                                                }
                                                onChange={(v) => {
                                                    field.handleChange(v);
                                                    if (v === 'Ticket Audit Table' || v === 'incident_master_table') {
                                                        formInstance.setFieldValue('tower', 'Ticket Audit');
                                                        formInstance.setFieldValue('reportType', 'Database');
                                                        formInstance.setFieldValue('ticketRequired', false);
                                                        formInstance.setFieldValue('ciItems', []);
                                                    }
                                                }}
                                                onBlur={field.handleBlur}
                                                data-field="reportFormat"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>

                            <SchedulePeriodSection
                                scheduleStartDate={scheduleStartDate}
                                setScheduleStartDate={handleStartDateChange}
                                scheduleStartTime={scheduleStartTime}
                                setScheduleStartTime={setScheduleStartTime}
                                scheduleEndDate={scheduleEndDate}
                                setScheduleEndDate={setScheduleEndDate}
                                recurrenceEnabled={recurrenceEnabled}
                                setRecurrenceEnabled={setRecurrenceEnabled}
                                recurrencePattern={recurrencePattern}
                                onOpenRecurrenceModal={() => setShowRecurrenceModal(true)}
                                disabled={getDisabled('schedulePeriod', null, mode === 'create' || mode === 'update')}
                                hideStartTime={selectedTower === 'Ticket Audit'}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end items-center pt-5 mt-6 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => navigate({ to: '/faste-ai/schedule-dashboard' })}
                            className="bg-slate-100/80 border border-slate-200 text-slate-700 font-bold text-xs px-8 py-2 rounded-full hover:bg-slate-200/80 active:scale-95 transition-all cursor-pointer"
                        >
                            Cancel
                        </button>

                        {mode === 'view' ? null : (
                            <formInstance.Subscribe selector={(s) => ({ isSubmitting: s.isSubmitting, canSubmit: s.canSubmit })}>
                                {({ isSubmitting, canSubmit }) => (
                                    <FormActionButton
                                        isSubmitting={isSubmitting}
                                        disabled={!canSubmit || isSubmitting}
                                        onClick={formInstance.handleSubmit}
                                        label={label}
                                        submittingLabel={submittingLabel}
                                        icon={icon}
                                        className={submitClassName}
                                        {...(mode === 'delete' ? { variant: 'danger' as const } : {})}
                                        {...(mode === 'update' ? { variant: 'primary' as const } : {})}
                                        {...(mode === 'create' ? { variant: 'brand' as const } : {})}
                                    />
                                )}
                            </formInstance.Subscribe>
                        )}
                    </div>
                </form>
            </div>

            {showRecurrenceModal && (
                <RecurrenceModal
                    open={showRecurrenceModal}
                    onClose={() => setShowRecurrenceModal(false)}
                    onSave={() => {
                        setRecurrenceEnabled(true);
                        setShowRecurrenceModal(false);
                    }}
                    recurrencePattern={recurrencePattern}
                    setRecurrencePattern={setRecurrencePattern}
                    recurrenceInterval={recurrenceInterval}
                    setRecurrenceInterval={setRecurrenceInterval}
                    recurrenceWeekDays={recurrenceWeekDays}
                    setRecurrenceWeekDays={setRecurrenceWeekDays}
                    monthlyType={monthlyType}
                    setMonthlyType={setMonthlyType}
                    monthlyDay={monthlyDay}
                    setMonthlyDay={setMonthlyDay}
                    monthlyWeek={monthlyWeek}
                    setMonthlyWeek={setMonthlyWeek}
                    monthlyWeekDay={monthlyWeekDay}
                    setMonthlyWeekDay={setMonthlyWeekDay}
                    scheduleStartDate={scheduleStartDate}
                    scheduleEndDate={scheduleEndDate}
                    setScheduleEndDate={setScheduleEndDate}
                />
            )}

            <SopModal
                open={showSopModal}
                onClose={() => setShowSopModal(false)}
                onCancel={() => {
                    formInstance.setFieldValue('sop', '');
                    setShowSopModal(false);
                }}
                sopDetails={currentSopDetails}
            />
        </div>
    );
};

export default ScheduleFormPage;
