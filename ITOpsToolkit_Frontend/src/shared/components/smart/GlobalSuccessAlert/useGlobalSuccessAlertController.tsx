import { useEffect, useRef, useState } from 'react';
import globalSuccessAlertEventBus from './global-success-alert-event-bus';
import type { GlobalSuccessAlertEvent } from './types';

type AlertPayload = GlobalSuccessAlertEvent['show-alert'];

export function useGlobalSuccessAlertController() {
    const [activeAlert, setActiveAlert] = useState<AlertPayload | null>(null);

    const [queue, setQueue] = useState<AlertPayload[]>([]);
    const isProcessingRef = useRef(false);
    const timeoutRef = useRef<number | null>(null);

    const clearTimer = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    const showAlert = (alert: AlertPayload) => {
        clearTimer();
        isProcessingRef.current = true;
        setActiveAlert(alert);

        if (alert.autoCloseDuration && alert.autoCloseDuration > 0) {
            timeoutRef.current = window.setTimeout(closeAlert, alert.autoCloseDuration);
        }
    };

    const closeAlert = () => {
        clearTimer();
        activeAlert?.onButtonClick?.();
        setActiveAlert(null);

        setQueue((prev) => {
            if (prev.length === 0) {
                isProcessingRef.current = false;
                return prev;
            }

            const [next, ...rest] = prev;
            setTimeout(() => showAlert(next), 0);
            return rest;
        });
    };

    const handleEvent = (alert: AlertPayload) => {
        const priority = alert.priority ?? 'normal';

        if (!isProcessingRef.current) {
            showAlert(alert);
            return;
        }

        if (priority === 'high') {
            setQueue((prev) => [alert, ...prev]);
            return;
        }

        setQueue((prev) => [...prev, alert]);
    };

    useEffect(() => {
        globalSuccessAlertEventBus.on('show-alert', handleEvent);
        return () => {
            clearTimer();
            globalSuccessAlertEventBus.off('show-alert', handleEvent);
        };
    }, []);

    return {
        open: Boolean(activeAlert),
        alertData: activeAlert,
        handleClose: closeAlert,
        queueLength: queue.length,
    };
}
