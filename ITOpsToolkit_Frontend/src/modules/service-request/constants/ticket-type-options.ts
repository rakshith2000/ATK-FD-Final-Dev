import type { SnowTableName } from '@/shared/modules/servicenow/types/ticket';

const ticketTypeOptions: Array<{ label: string; value: SnowTableName }> = [
    {
        label: 'SC REQ',
        value: 'sc_request',
    },
];

export default ticketTypeOptions;
