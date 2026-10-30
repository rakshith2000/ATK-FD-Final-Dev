import type { ReactNode } from 'react';
export type Severity = 'success' | 'brand';

export type GlobalSuccessAlertLink = {
    href?: string;
    label: ReactNode;
    target?: string;
    rel?: string;
};

export type GlobalSuccessAlertEventPayload = {
    title?: string;
    note?: ReactNode;
    noteText?: ReactNode;
    link?: GlobalSuccessAlertLink;
    severity: Severity;
    buttonText?: string;
    buttonClassName?: string;
    onButtonClick?: () => void;
    autoCloseDuration?: number; // ms
    actions?: { label: string; onClick: () => void; variant?: 'brand' | 'success' }[];

    priority?: 'normal' | 'high';
};

export type GlobalSuccessAlertEvent = {
    'show-alert': GlobalSuccessAlertEventPayload;
};
