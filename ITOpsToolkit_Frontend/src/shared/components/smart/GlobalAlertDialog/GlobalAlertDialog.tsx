import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { useGlobalAlertDialogController } from './useGlobalAlertDialogController';

const STATUS_PROPS = {
    success: {
        accent: 'text-emerald-600',
        iconBg: 'bg-emerald-50',
        button: 'text-emerald-600 border border-emerald-600 bg-white hover:text-white hover:bg-emerald-600/80 focus:text-white focus:bg-emerald-600/80',
        title: 'Success',
        icon: <CheckCircle size={18} />,
        defaultButton: 'Dismiss',
    },
    error: {
        accent: 'text-red-500',
        iconBg: 'bg-red-50',
        button: 'text-red-500 border border-red-500 bg-white hover:text-white hover:bg-red-500/80 focus:text-white focus:bg-red-500/80',
        title: 'Error',
        icon: <XCircle size={18} />,
        defaultButton: 'Dismiss',
    },
    warning: {
        accent: 'text-amber-500',
        iconBg: 'bg-amber-50',
        button: 'text-amber-500 border border-amber-500 bg-white hover:text-white hover:bg-amber-500/80 focus:text-white focus:bg-amber-500/80',
        title: 'Warning',
        icon: <AlertTriangle size={18} />,
        defaultButton: 'Dismiss',
    },
    info: {
        accent: 'text-blue-500',
        iconBg: 'bg-blue-50',
        button: 'text-blue-500 border border-blue-500 bg-white hover:text-white hover:bg-blue-500/80 focus:text-white focus:bg-blue-500/80',
        title: 'Info',
        icon: <Info size={18} />,
        defaultButton: 'Dismiss',
    },
    brand: {
        accent: 'var(--brand-color)',
        iconBg: 'bg-[var(--brand-color)]/10',
        button: 'text-white border-none border-transparent brand-btn-with-gradient-to-bottom hover:scale-[1.01] active:scale-[0.98]',
        title: 'Notice',
        icon: <Info size={18} className="text-(--brand-color)" />,
        defaultButton: 'Dismiss',
    },
};

function GlobalAlertDialog() {
    const { open, dialogData, handleClose } = useGlobalAlertDialogController();

    useEffect(() => {
        if (!open) return;

        document.body.style.overflow = 'hidden';

        const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && handleClose();
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open, handleClose]);

    if (!open || !dialogData) return null;

    const severity = dialogData.severity ?? 'info';
    const props = STATUS_PROPS[severity];

    return (
        <div className="fixed inset-0 z-50000 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={() => {}} />

            <div
                role="dialog"
                aria-modal="true"
                className="relative w-full max-w-xs rounded-lg bg-white p-4 shadow-lg animate-[fadeIn_120ms_ease-out] overflow-y-auto max-h-[80vh]"
            >
                <button
                    disabled
                    onClick={handleClose}
                    aria-label="Close"
                    className="hidden absolute right-2.5 top-2.5 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
                >
                    <X size={14} />
                </button>
                <div className="flex items-center gap-2.5 mb-2.5">
                    <div className={`flex items-center justify-center size-8 rounded-full ${props.iconBg}`}>
                        <span className={props.accent}>{props.icon}</span>
                    </div>
                    <h2 className={`text-sm font-semibold ${props.accent}`}>{dialogData.title || props.title}</h2>
                </div>
                {dialogData.note && <p className="mb-3 text-xs text-gray-600 leading-relaxed wrap-break-word">{dialogData.note}</p>}
                {dialogData.actions ? (
                    <div className="flex gap-2 mt-3">
                        {dialogData.actions.map((action, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    action.onClick();
                                    handleClose();
                                }}
                                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                    action.variant === 'brand'
                                        ? 'bg-(--brand-color)/10 hover:bg-(--brand-color) text-(--brand-color) hover:text-(--brand-text-inverse) focus:bg-(--brand-color) focus:text-(--brand-text-inverse) border border-(--brand-color)/50'
                                        : action.variant === 'error'
                                          ? 'bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white focus:bg-red-500 focus:text-white border border-red-500/30'
                                          : action.variant === 'success'
                                            ? 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white focus:bg-emerald-500 focus:text-white border border-emerald-500/30'
                                            : action.variant === 'warning'
                                              ? 'bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white focus:bg-amber-500 focus:text-white border border-amber-500/30'
                                              : 'bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white focus:bg-blue-500 focus:text-white border border-blue-500/30'
                                }`}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <button
                        onClick={handleClose}
                        className={twMerge(`w-full rounded-md px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer ${props.button}`, dialogData.buttonClassName)}
                    >
                        {dialogData.buttonText || props.defaultButton}
                    </button>
                )}
            </div>
        </div>
    );
}

export default GlobalAlertDialog;
