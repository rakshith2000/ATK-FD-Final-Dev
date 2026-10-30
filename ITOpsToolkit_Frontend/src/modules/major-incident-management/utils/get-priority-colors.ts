export const getPriorityDotColor = (priorityVal: string): string => {
    const priorityDotColors: Record<string, string> = {
        '1': 'bg-rose-500 shadow-rose-500/50',
        '2': 'bg-amber-500 shadow-amber-500/50',
        '3': 'bg-yellow-500 shadow-yellow-500/50',
        '4': 'bg-blue-500 shadow-blue-500/50',
        '5': 'bg-slate-500 shadow-slate-500/50',
    };
    return priorityDotColors[priorityVal] ?? 'bg-indigo-500 shadow-indigo-500/50';
};

export const getPriorityTextColor = (priorityVal: string): string => {
    const priorityTextColors: Record<string, string> = {
        '1': 'text-rose-500',
        '2': 'text-amber-500',
        '3': 'text-yellow-500',
        '4': 'text-blue-500',
        '5': 'text-slate-500',
    };

    return priorityTextColors[priorityVal] ?? 'text-indigo-500';
};
