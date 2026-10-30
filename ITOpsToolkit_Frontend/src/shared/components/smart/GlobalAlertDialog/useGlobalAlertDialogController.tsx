import { useEffect, useRef, useState } from 'react';
import globalAlertDialogEventBus from './global-alert-dialog-event-bus';
import type { GlobalAlertDialogEvent } from './types';

type DialogPayload = GlobalAlertDialogEvent['show-dialog'];

export function useGlobalAlertDialogController() {
    const [activeDialog, setActiveDialog] = useState<DialogPayload | null>(null);

    const [queue, setQueue] = useState<DialogPayload[]>([]);
    const isProcessingRef = useRef(false);
    const timeoutRef = useRef<number | null>(null);

    const clearTimer = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    const showDialog = (dialog: DialogPayload) => {
        clearTimer();
        isProcessingRef.current = true;
        setActiveDialog(dialog);

        if (dialog.autoCloseDuration && dialog.autoCloseDuration > 0) {
            timeoutRef.current = window.setTimeout(closeDialog, dialog.autoCloseDuration);
        }
    };

    const closeDialog = () => {
        clearTimer();
        activeDialog?.onButtonClick?.();
        setActiveDialog(null);

        setQueue((prev) => {
            if (prev.length === 0) {
                isProcessingRef.current = false;
                return prev;
            }

            const [next, ...rest] = prev;
            setTimeout(() => showDialog(next), 0);
            return rest;
        });
    };

    const handleEvent = (dialog: DialogPayload) => {
        const priority = dialog.priority ?? 'normal';

        // No active dialog -> show immediately
        if (!isProcessingRef.current) {
            showDialog(dialog);
            return;
        }

        // High priority -> jump to front of queue (NOT interrupt)
        if (priority === 'high') {
            setQueue((prev) => [dialog, ...prev]);
            return;
        }

        // Normal -> FIFO enqueue
        setQueue((prev) => [...prev, dialog]);
    };

    useEffect(() => {
        globalAlertDialogEventBus.on('show-dialog', handleEvent);
        return () => {
            clearTimer();
            globalAlertDialogEventBus.off('show-dialog', handleEvent);
        };
    }, []);

    return {
        open: Boolean(activeDialog),
        dialogData: activeDialog,
        handleClose: closeDialog,
        queueLength: queue.length,
    };
}
