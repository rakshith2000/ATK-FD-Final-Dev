import type { SnowTicketField } from '@/shared/modules/servicenow/types/ticket';

export function getOptionFromSnowDataField(field: { display_value?: string; value?: string } | null | undefined | SnowTicketField): { label: string; value: string } | null {
    if (!field?.display_value || !field?.value) return null;
    return { label: field.display_value, value: field.value };
}

export const withFallbackOptionFromSnowDataField = (
    data: Array<{ label: string; value: string }> | undefined,
    field: { display_value?: string; value?: string } | null | undefined | SnowTicketField,
) => data ?? (getOptionFromSnowDataField(field) ? [getOptionFromSnowDataField(field)!] : []);
