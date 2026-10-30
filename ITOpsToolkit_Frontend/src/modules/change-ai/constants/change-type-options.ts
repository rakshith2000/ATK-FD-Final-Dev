import type { SelectOption } from '@/shared/components/ui/InputFields';

/** Change model (chg_model) options for a ServiceNow change request. */
const changeTypeOptions: SelectOption[] = [
    { label: 'Normal', value: 'Normal' },
    { label: 'Standard', value: 'Standard' },
    { label: 'Emergency', value: 'Emergency' },
];

export default changeTypeOptions;
