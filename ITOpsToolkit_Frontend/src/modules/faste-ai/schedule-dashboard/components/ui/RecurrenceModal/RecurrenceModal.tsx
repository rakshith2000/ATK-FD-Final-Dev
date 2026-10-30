import React, { useMemo } from 'react';
import { Settings } from 'lucide-react';
import Modal from '@/shared/components/ui/Modal/Modal';
import { DateInput, SelectInput, type SelectOption } from '@/shared/components/ui/InputFields';
import { getNextMonthlyRunDates } from '../../../utils/recurrenceHelpers';

interface RecurrenceModalProps {
    open: boolean;
    onClose: () => void;
    onSave: () => void;
    recurrencePattern: string;
    setRecurrencePattern: (val: string) => void;
    recurrenceInterval: number;
    setRecurrenceInterval: (val: number) => void;
    recurrenceWeekDays: string[];
    setRecurrenceWeekDays: (val: string[]) => void;
    monthlyType: 'DayOfMonth' | 'DayOfWeek';
    setMonthlyType: (val: 'DayOfMonth' | 'DayOfWeek') => void;
    monthlyDay: number;
    setMonthlyDay: (val: number) => void;
    monthlyWeek: 'First' | 'Second' | 'Third' | 'Fourth' | 'Last';
    setMonthlyWeek: (val: 'First' | 'Second' | 'Third' | 'Fourth' | 'Last') => void;
    monthlyWeekDay: string;
    setMonthlyWeekDay: (val: string) => void;
    scheduleStartDate: string;
    scheduleEndDate: string;
    setScheduleEndDate: (val: string) => void;
}

const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const dayIndices = [1, 2, 3, 4, 5, 6, 0];
const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const RecurrenceModal: React.FC<RecurrenceModalProps> = ({
    open,
    onClose,
    onSave,
    recurrencePattern,
    setRecurrencePattern,
    recurrenceInterval,
    setRecurrenceInterval,
    recurrenceWeekDays,
    setRecurrenceWeekDays,
    monthlyType,
    setMonthlyType,
    monthlyDay,
    setMonthlyDay,
    monthlyWeek,
    setMonthlyWeek,
    monthlyWeekDay,
    setMonthlyWeekDay,
    scheduleStartDate,
    scheduleEndDate,
    setScheduleEndDate,
}) => {
    const getDaysText = () => {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const selectedNames = recurrenceWeekDays.map((d) => dayNames[parseInt(d, 10)]);
        if (selectedNames.length === 0) return 'No days selected';
        if (selectedNames.length === 7) return 'day';
        return selectedNames.join(', ');
    };

    const nextMonthlyRunDates = useMemo(() => {
        return getNextMonthlyRunDates(new Date(scheduleStartDate), recurrenceInterval, monthlyType, monthlyDay, monthlyWeek, monthlyWeekDay, 5);
    }, [scheduleStartDate, recurrenceInterval, monthlyType, monthlyDay, monthlyWeek, monthlyWeekDay]);

    const dayOptions: SelectOption[] = useMemo(() => Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: String(i + 1) })), []);

    const weekOccurrenceOptions: SelectOption[] = useMemo(
        () => [
            { label: 'First', value: 'First' },
            { label: 'Second', value: 'Second' },
            { label: 'Third', value: 'Third' },
            { label: 'Fourth', value: 'Fourth' },
            { label: 'Last', value: 'Last' },
        ],
        [],
    );

    const weekdayOptions: SelectOption[] = useMemo(
        () => [
            { label: 'Sunday', value: '0' },
            { label: 'Monday', value: '1' },
            { label: 'Tuesday', value: '2' },
            { label: 'Wednesday', value: '3' },
            { label: 'Thursday', value: '4' },
            { label: 'Friday', value: '5' },
            { label: 'Saturday', value: '6' },
        ],
        [],
    );

    return (
        <Modal open={open} size="2xl" onClose={onClose} className="p-0">
            <Modal.Header className="p-5 border-b border-slate-100">
                <h3 className="text-(--brand-title-primary-color) font-bold text-base flex items-center gap-2">
                    <Settings size={18} /> Configure Recurrence
                </h3>
            </Modal.Header>

            <Modal.Body className="p-6 space-y-4 max-h-[60dvh] overflow-y-auto mb-0">
                <div className="bg-[#F0F7FF] border border-[#BBDDFF] rounded-xl p-5 w-full space-y-4">
                    <div className="flex items-center gap-6 pb-2">
                        {['Daily', 'Weekly', 'Monthly'].map((p) => (
                            <label key={p} className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={recurrencePattern === p}
                                    onChange={() => setRecurrencePattern(p)}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-400 border-slate-300"
                                />{' '}
                                {p}
                            </label>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 text-sm font-bold text-slate-800">
                        <span className="text-blue-950">Recur Every:</span>
                        <input
                            type="number"
                            min="1"
                            max={recurrencePattern === 'Daily' ? 30 : 4}
                            value={recurrenceInterval}
                            onChange={(e) => {
                                const maxVal = recurrencePattern === 'Daily' ? 30 : 4;
                                setRecurrenceInterval(e.target.value === '' ? 1 : Math.min(maxVal, Math.max(1, parseInt(e.target.value, 10))));
                            }}
                            className="w-16 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-center font-medium outline-none focus:border-blue-400"
                        />
                        <span className="text-slate-500 font-medium">{recurrencePattern === 'Daily' ? 'day(s)' : recurrencePattern === 'Weekly' ? 'week(s)' : 'month(s)'}</span>
                    </div>

                    {recurrencePattern === 'Daily' && (
                        <div className="space-y-4 pt-1">
                            <div className="text-xs font-semibold text-slate-600 border-t border-blue-200/60 pt-4 flex items-center gap-2 flex-wrap">
                                <span>
                                    Occurs every {recurrenceInterval === 1 ? 'day' : `${recurrenceInterval} days`} {scheduleEndDate ? 'until' : '.'}
                                </span>
                                <div className="w-36">
                                    <DateInput value={scheduleEndDate} min={scheduleStartDate} onChange={(v) => setScheduleEndDate(v || '')} />
                                </div>
                            </div>
                        </div>
                    )}

                    {recurrencePattern === 'Weekly' && (
                        <div className="space-y-4 pt-1">
                            <div className="flex gap-1.5 justify-between">
                                {dayLabels.map((label, idx) => {
                                    const dayIdx = dayIndices[idx];
                                    const isSelected = recurrenceWeekDays.includes(dayIdx.toString());
                                    return (
                                        <button
                                            type="button"
                                            key={idx}
                                            onClick={() => setRecurrenceWeekDays([dayIdx.toString()])}
                                            className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black border transition-all active:scale-95 ${isSelected ? 'bg-(--brand-title-primary-color) border-transparent text-white shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="text-xs font-semibold text-slate-600 border-t border-blue-200/60 pt-4 flex items-center gap-2 flex-wrap">
                                <span>
                                    Occurs every {getDaysText()} {scheduleEndDate ? 'until' : '.'}
                                </span>
                                <div className="w-36">
                                    <DateInput value={scheduleEndDate} min={scheduleStartDate} onChange={(v) => setScheduleEndDate(v || '')} />
                                </div>
                            </div>
                        </div>
                    )}

                    {recurrencePattern === 'Monthly' && (
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                                <input
                                    type="radio"
                                    checked={monthlyType === 'DayOfMonth'}
                                    onChange={() => setMonthlyType('DayOfMonth')}
                                    className="w-4 h-4 text-blue-950 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                />
                                <span>Day</span>
                                <div className="w-20">
                                    <SelectInput
                                        options={dayOptions}
                                        value={String(monthlyDay)}
                                        clearable={false}
                                        onChange={(val) => setMonthlyDay(Number(val))}
                                        disabled={monthlyType !== 'DayOfMonth'}
                                    />
                                </div>
                                <span>of the month</span>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                <input
                                    type="radio"
                                    checked={monthlyType === 'DayOfWeek'}
                                    onChange={() => setMonthlyType('DayOfWeek')}
                                    className="w-4 h-4 text-blue-950 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                />
                                <span>The</span>
                                <div className="w-24">
                                    <SelectInput
                                        options={weekOccurrenceOptions}
                                        value={monthlyWeek}
                                        clearable={false}
                                        onChange={(val) => setMonthlyWeek(val as 'First' | 'Second' | 'Third' | 'Fourth' | 'Last')}
                                        disabled={monthlyType !== 'DayOfWeek'}
                                    />
                                </div>
                                <div className="w-28">
                                    <SelectInput
                                        options={weekdayOptions}
                                        value={monthlyWeekDay}
                                        clearable={false}
                                        onChange={setMonthlyWeekDay}
                                        disabled={monthlyType !== 'DayOfWeek'}
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50/80 p-4 border border-slate-100 rounded-xl space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Next 5 Scheduled Dates:</label>
                                <div className="flex flex-wrap gap-2">
                                    {nextMonthlyRunDates.map((date, idx) => (
                                        <div key={idx} className="bg-white border border-slate-200 shadow-sm rounded-xl px-3 py-1.5 flex flex-col items-center min-w-21.25">
                                            <span className="text-[9px] font-black text-slate-400">{dayNamesShort[date.getDay()].toUpperCase()}</span>
                                            <span className="text-[11px] font-bold text-slate-800">{date.toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                <button
                    type="button"
                    onClick={onClose}
                    className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    className="bg-(--brand-title-primary-color) text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow hover:bg-blue-900 transition-all"
                >
                    Save Pattern
                </button>
            </Modal.Footer>
        </Modal>
    );
};
