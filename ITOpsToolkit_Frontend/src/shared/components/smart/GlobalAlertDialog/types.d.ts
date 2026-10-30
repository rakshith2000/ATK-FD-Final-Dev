export type Severity = 'error' | 'warning' | 'info' | 'success' | 'brand';

export type GlobalAlertDialogEventPayload = {
    title: string;
    note: string;
    severity: Severity;
    autoCloseDuration?: number; // ms
    buttonText?: string;
    buttonClassName?: string;
    onButtonClick?: () => void;
    actions?: { label: string; onClick: () => void; variant?: 'brand' | 'error' | 'success' | 'warning' | 'info' }[];
    priority?: 'normal' | 'high';
};

export type GlobalAlertDialogEvent = {
    'show-dialog': GlobalAlertDialogEventPayload;
};
