export const getStateDotColor = (label: string): string => {
    const key = label.toLowerCase().trim().replace(/\s+/g, '-');
    const dotColors: Record<string, string> = {
        new: 'bg-rose-500 shadow-rose-500/50',
        'in-progress': 'bg-blue-500 shadow-blue-500/50',
        'on-hold': 'bg-amber-500 shadow-amber-500/50',
        resolved: 'bg-purple-500 shadow-purple-500/50',
        closed: 'bg-violet-600 shadow-violet-600/50',
        assess: 'bg-pink-500 shadow-pink-500/50',
        pending: 'bg-cyan-500 shadow-cyan-500/50',
        'work-in-progress': 'bg-orange-500 shadow-orange-500/50',
    };
    return dotColors[key] ?? 'bg-gray-400 shadow-gray-400/50';
};

export const getStateTextColor = (label: string): string => {
    const key = label.toLowerCase().trim().replace(/\s+/g, '-');

    const textColors: Record<string, string> = {
        new: 'text-rose-500',
        'in-progress': 'text-blue-500',
        'on-hold': 'text-amber-500',
        resolved: 'text-purple-500',
        closed: 'text-violet-600',
        assess: 'text-pink-500',
        pending: 'text-cyan-500',
        'work-in-progress': 'text-orange-500',
    };

    return textColors[key] ?? 'text-gray-400';
};
