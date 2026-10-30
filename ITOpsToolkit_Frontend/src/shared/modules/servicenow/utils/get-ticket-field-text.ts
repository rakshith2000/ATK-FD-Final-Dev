const getTicketFieldText = (field: unknown): string => {
    if (!field) return '';
    if (typeof field === 'string') return field.toLowerCase();
    if (typeof field === 'object') {
        const f = field as Record<string, string>;
        if (f.display_value) return f.display_value.toLowerCase();
        if (f.value) return f.value.toLowerCase();
    }
    return '';
};

export default getTicketFieldText;
