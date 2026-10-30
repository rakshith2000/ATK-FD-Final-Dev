import { useMemo } from 'react';
import { useGlobalAlertToastController } from './useGlobalAlertToastController';
import type { AlertToastPosition } from './types';
import AlertToastStack from './AlertToastStack';

const POSITIONS: AlertToastPosition[] = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];

function GlobalAlertToast() {
    const { alerts, removeAlert } = useGlobalAlertToastController();

    const grouped = useMemo(() => {
        return alerts.reduce<Record<AlertToastPosition, typeof alerts>>(
            (acc, alert) => {
                acc[alert.position] ??= [];
                acc[alert.position].push(alert);
                return acc;
            },
            {
                'top-left': [],
                'top-center': [],
                'top-right': [],
                'bottom-left': [],
                'bottom-center': [],
                'bottom-right': [],
            },
        );
    }, [alerts]);

    return (
        <>
            {POSITIONS.map((position) => (
                <AlertToastStack key={position} position={position} alerts={grouped[position]} removeAlert={removeAlert} />
            ))}
        </>
    );
}

export default GlobalAlertToast;
