export const findNthDayOfWeek = (year: number, month: number, dayOfWeek: number, occurrence: string): Date | null => {
    const dates: Date[] = [];
    const d = new Date(year, month, 1);
    while (d.getMonth() === month) {
        if (d.getDay() === dayOfWeek) dates.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }
    if (occurrence === 'Last') return dates.length > 0 ? dates[dates.length - 1] : null;
    const index = ['First', 'Second', 'Third', 'Fourth'].indexOf(occurrence);
    return dates.length >= index + 1 ? dates[index] : null;
};

export const getNextMonthlyRunDates = (
    startDate: Date,
    interval: number,
    monthlyType: 'DayOfMonth' | 'DayOfWeek',
    monthlyDay: number,
    monthlyWeek: string,
    monthlyWeekDay: string,
    count = 5,
): Date[] => {
    const nextDates: Date[] = [];
    const dayOfWeekInt = parseInt(monthlyWeekDay, 10);
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    const startDateTimestamp = startDate.getTime();

    for (let i = 0; nextDates.length < count && i < 24; i++) {
        const targetMonthIndex = startMonth + i;
        if (i > 0 && i % interval !== 0) continue;
        const year = startYear + Math.floor(targetMonthIndex / 12);
        const month = targetMonthIndex % 12;
        let dayToRun: Date | null = null;

        if (monthlyType === 'DayOfMonth') {
            const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
            dayToRun = new Date(year, month, Math.min(monthlyDay, lastDayOfMonth));
        } else {
            dayToRun = findNthDayOfWeek(year, month, dayOfWeekInt, monthlyWeek);
        }
        if (dayToRun && dayToRun.getTime() > startDateTimestamp) nextDates.push(dayToRun);
    }
    return nextDates;
};
