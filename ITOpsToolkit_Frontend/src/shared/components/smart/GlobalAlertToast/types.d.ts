export type AlertSeverity = 'success' | 'error' | 'warning' | 'info';

export type AlertToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export type GlobalAlertToastPayload = {
    id?: string;
    title: string;
    description?: string;
    severity?: AlertSeverity;
    autoCloseDuration?: number;
    position?: AlertToastPosition;
};

export type GlobalAlertToastEvent = {
    'show-alert-toast': GlobalAlertToastPayload;
};
