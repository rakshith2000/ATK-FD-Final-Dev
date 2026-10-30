import { memo, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { AlertToastPosition } from './types';

type Alert = {
    id: string;
    title: string;
    description?: string;
    severity?: 'success' | 'error' | 'warning' | 'info';
    autoCloseDuration?: number;
};

const SEVERITY_STYLES = {
    success: {
        container: 'bg-emerald-50/80 hover:bg-emerald-50 border-emerald-200/60 hover:border-emerald-300',
        icon: <CheckCircle size={14} className="text-emerald-500 shrink-0" />,
        title: 'text-emerald-700',
        desc: 'text-emerald-600/70',
        close: 'text-emerald-400/50 hover:text-emerald-600',
    },
    error: {
        container: 'bg-red-50/80 hover:bg-red-50 border-red-200/60 hover:border-red-300',
        icon: <XCircle size={14} className="text-red-500 shrink-0" />,
        title: 'text-red-700',
        desc: 'text-red-600/70',
        close: 'text-red-400/50 hover:text-red-600',
    },
    warning: {
        container: 'bg-amber-50/80 hover:bg-amber-50 border-amber-200/60 hover:border-amber-300',
        icon: <AlertTriangle size={14} className="text-amber-500 shrink-0" />,
        title: 'text-amber-700',
        desc: 'text-amber-600/70',
        close: 'text-amber-400/50 hover:text-amber-600',
    },
    info: {
        container: 'bg-blue-50/80 hover:bg-blue-50 border-blue-200/60 hover:border-blue-300',
        icon: <Info size={14} className="text-blue-500 shrink-0" />,
        title: 'text-blue-700',
        desc: 'text-blue-600/70',
        close: 'text-blue-400/50 hover:text-blue-600',
    },
};

const POSITION_CLASSES: Record<AlertToastPosition, string> = {
    'top-left': 'top-3 left-3 items-start',
    'top-center': 'top-3 left-1/2 -translate-x-1/2 items-center',
    'top-right': 'top-3 right-3 items-end',
    'bottom-left': 'bottom-3 left-3 items-start',
    'bottom-center': 'bottom-3 left-1/2 -translate-x-1/2 items-center',
    'bottom-right': 'bottom-3 right-3 items-end',
};

type Props = {
    position: AlertToastPosition;
    alerts: Alert[];
    removeAlert: (id: string) => void;
};

function AlertToastItem({ alert, removeAlert }: { alert: Alert; removeAlert: (id: string) => void }) {
    const severity = alert.severity ?? 'info';
    const style = SEVERITY_STYLES[severity];
    const timerRef = useRef<number | null>(null);
    const remainingRef = useRef(alert.autoCloseDuration ?? 3000);
    const startRef = useRef(0);
    const removeRef = useRef(removeAlert);
    removeRef.current = removeAlert;

    const clearTimer = () => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const start = () => {
        clearTimer();
        startRef.current = Date.now();
        timerRef.current = window.setTimeout(() => removeRef.current(alert.id), remainingRef.current);
    };

    const pause = () => {
        if (timerRef.current !== null) {
            clearTimer();
            remainingRef.current -= Date.now() - startRef.current;
            if (remainingRef.current < 0) remainingRef.current = 0;
        }
    };

    useEffect(() => {
        start();
        return clearTimer;
    }, []);

    return (
        <div
            role="status"
            onMouseEnter={pause}
            onMouseLeave={start}
            className={`flex items-start gap-2 rounded-md border px-1.5 py-1.5 shadow-sm max-w-72 transition-colors ${style.container}`}
        >
            <div className="mt-px">{style.icon}</div>
            <div className="flex-1 min-w-0">
                <div className={`text-[0.75rem] font-medium leading-tight ${style.title}`}>{alert.title}</div>
                {alert.description && <div className={`text-[0.65rem] leading-snug mt-0.5 ${style.desc}`}>{alert.description}</div>}
            </div>
            <button onClick={() => removeAlert(alert.id)} className={`mt-px transition-colors cursor-pointer ${style.close}`}>
                <X size={12} />
            </button>
        </div>
    );
}

function AlertToastStack({ position, alerts, removeAlert }: Props) {
    if (alerts.length === 0) return null;

    return (
        <div className={`fixed z-50000 flex flex-col gap-1.5 ${POSITION_CLASSES[position]}`}>
            {alerts.map((alert) => (
                <AlertToastItem key={alert.id} alert={alert} removeAlert={removeAlert} />
            ))}
        </div>
    );
}

export default memo(AlertToastStack);
