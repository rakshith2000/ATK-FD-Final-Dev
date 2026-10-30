import { useEffect, useState } from 'react';
import globalAlertToastEventBus from './global-alert-toast-event-bus';
import type { AlertToastPosition, GlobalAlertToastPayload } from './types';
import { DEFAULT_ALERT_TOAST_DURATION, DEFAULT_ALERT_TOAST_POSITION } from './global-alert-toast-config';

type NormalizedAlertToast = GlobalAlertToastPayload & { position: AlertToastPosition; id: string };

export function useGlobalAlertToastController() {
    const [alerts, setAlerts] = useState<NormalizedAlertToast[]>([]);

    const removeAlert = (id: string) => {
        setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    };

    const showAlert = (payload: GlobalAlertToastPayload) => {
        const id = payload.id ?? crypto.randomUUID();

        const alert: NormalizedAlertToast = {
            ...payload,
            id,
            position: payload.position ?? DEFAULT_ALERT_TOAST_POSITION,
            autoCloseDuration: payload.autoCloseDuration ?? DEFAULT_ALERT_TOAST_DURATION,
        };

        setAlerts((prev) => [...prev, alert]);
    };

    useEffect(() => {
        globalAlertToastEventBus.on('show-alert-toast', showAlert);
        return () => {
            globalAlertToastEventBus.off('show-alert-toast', showAlert);
        };
    }, []);

    return {
        alerts,
        removeAlert,
    };
}
