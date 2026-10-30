import React from 'react';
import { RefreshCw } from 'lucide-react';
import { DateInput } from '@/shared/components/ui/InputFields';

interface SchedulePeriodSectionProps {
    scheduleStartDate: string;
    setScheduleStartDate: (val: string) => void;
    scheduleStartTime: string;
    setScheduleStartTime: (val: string) => void;
    scheduleEndDate: string;
    setScheduleEndDate: (val: string) => void;
    recurrenceEnabled: boolean;
    setRecurrenceEnabled: (val: boolean) => void;
    recurrencePattern: string;
    onOpenRecurrenceModal: () => void;
    disabled?: boolean;
    hideStartTime?: boolean;
}

export const SchedulePeriodSection: React.FC<SchedulePeriodSectionProps> = ({
    scheduleStartDate,
    setScheduleStartDate,
    scheduleStartTime,
    setScheduleStartTime,
    scheduleEndDate,
    setScheduleEndDate,
    recurrenceEnabled,
    setRecurrenceEnabled,
    recurrencePattern,
    onOpenRecurrenceModal,
    disabled = false,
    hideStartTime = false,
}) => {
    const today = new Date().toISOString().split('T')[0];

    const handleTimeClick = (e: React.MouseEvent<HTMLInputElement>) => {
        if (disabled) return;
        try {
            e.currentTarget.showPicker();
        } catch {
            // Fallback if browser doesn't support showPicker()
        }
    };

    const handleStartDateChange = (val: string) => {
        const newStartDate = val || '';
        setScheduleStartDate(newStartDate);
        if (!newStartDate || (scheduleEndDate && newStartDate > scheduleEndDate)) {
            setScheduleEndDate('');
        }
    };

    const isEndDateDisabled = disabled || !scheduleStartDate;

    return (
        <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-800">Schedule period</label>
            <div className="bg-[#f2f6ff] border border-[#d6e4ff] rounded-xl p-5 space-y-4 shadow-sm">
                <div className={hideStartTime ? 'space-y-1 text-xs font-bold' : 'grid grid-cols-2 gap-4 text-xs font-bold'}>
                    <div className="space-y-1">
                        <label className="text-blue-900 block">Start Date</label>
                        <DateInput value={scheduleStartDate} min={today} onChange={(v) => handleStartDateChange(v || '')} disabled={disabled} />
                    </div>
                    {!hideStartTime && (
                        <div className="space-y-1">
                            <label className="text-blue-900 block">Start Time</label>
                            <input
                                type="time"
                                value={scheduleStartTime}
                                onChange={(e) => setScheduleStartTime(e.target.value)}
                                onClick={handleTimeClick}
                                disabled={disabled}
                                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs outline-none h-6.5 disabled:opacity-50 cursor-pointer"
                            />
                        </div>
                    )}
                </div>

                <div className="space-y-1 text-xs font-bold">
                    <label className="text-blue-900 block">
                        End Date <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <DateInput value={scheduleEndDate} min={scheduleStartDate || today} onChange={(v) => setScheduleEndDate(v || '')} disabled={isEndDateDisabled} />
                </div>

                {recurrenceEnabled ? (
                    <div className="bg-white border border-blue-100 rounded-xl p-3.5 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                        <p className="text-xs font-semibold text-blue-950">
                            Recurrence: <span className="text-blue-600 font-bold capitalize">{recurrencePattern}</span>
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onOpenRecurrenceModal}
                                disabled={disabled}
                                className="bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[10px] px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                                Configure
                            </button>
                            <button
                                type="button"
                                onClick={() => setRecurrenceEnabled(false)}
                                disabled={disabled}
                                className="bg-red-50 text-red-600 border border-red-100 font-bold text-[10px] px-2.5 py-1.5 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onOpenRecurrenceModal}
                        disabled={disabled}
                        className="w-full border border-blue-200 bg-white hover:bg-slate-50 text-blue-950 font-bold text-xs py-2 px-4 rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        <RefreshCw size={12} /> Add Recurrence
                    </button>
                )}
            </div>
        </div>
    );
};
