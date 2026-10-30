import { createPortal } from 'react-dom';
import { getPortalContainer } from '@/shared/utils/get-portal-container';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { X } from 'lucide-react';
import { useEffect, useState, type FC, type ReactNode, type HTMLAttributes, type ButtonHTMLAttributes, type CSSProperties } from 'react';

interface SlotProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
    children?: ReactNode;
    className?: ClassNameValue;
}

export interface ModalProps {
    open?: boolean;
    keepMounted?: boolean;
    children?: ReactNode;
    className?: ClassNameValue;
    protalClassName?: ClassNameValue;
    closeButtonClassName?: ClassNameValue;
    closeOnEscapeKeyDown?: boolean;
    closeOnOutsideClick?: boolean;
    onClose?: () => void;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
}

const variantClasses = {
    primary: 'text-blue-500 border border-blue-500 bg-white hover:text-white hover:bg-blue-500/80 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
    secondary: 'text-gray-500 border border-gray-200 bg-white hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-1',
    danger: 'text-red-500 border border-red-500 bg-white hover:text-white hover:bg-red-500/80 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1',
    success: 'text-green-500 border border-green-500 bg-white hover:text-white hover:bg-green-500/80 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1',
    warning: 'text-amber-500 border border-amber-500 bg-white hover:text-white hover:bg-amber-500/80 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1',
    ghost: 'text-gray-500 border border-transparent bg-white hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-1',
    brand: 'text-white btn-split split-blue hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
    'pill-green': 'text-white  border-none border-transparent btn-split split-green hover:scale-[1.01] active:scale-[0.98]',
    'pill-green-light': 'text-(--change-arrow-text) btn-split split-white-green-light  border-none border-transparent hover:scale-[1.01] active:scale-[0.98]',
} as const;

type ActionButtonVariant = keyof typeof variantClasses;

interface ActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
    variant?: ActionButtonVariant;
    className?: ClassNameValue;
}

interface ModalComposition {
    Header: FC<SlotProps>;
    Body: FC<SlotProps>;
    Footer: FC<SlotProps>;
    ActionButton: FC<ActionButtonProps>;
}

const modalStyles: Record<NonNullable<ModalProps['size']>, CSSProperties> = {
    xs: { width: '100%', maxWidth: '20rem', maxHeight: '40dvh' },
    sm: { width: '100%', maxWidth: '24rem', maxHeight: '50dvh' },
    md: { width: '100%', maxWidth: '28rem', maxHeight: '60dvh' },
    lg: { width: '100%', maxWidth: '32rem', maxHeight: '70dvh' },
    xl: { width: '100%', maxWidth: '36rem', maxHeight: '80dvh' },
    '2xl': { width: '100%', maxWidth: '42rem', maxHeight: '90dvh' },
    '3xl': { width: '100%', maxWidth: '48rem', maxHeight: '90dvh' },
    '4xl': { width: '100%', maxWidth: '56rem', maxHeight: '90dvh' },
    '5xl': { width: '100%', maxWidth: '64rem', maxHeight: '90dvh' },
    '6xl': { width: '100%', maxWidth: '72rem', maxHeight: '90dvh' },
    '7xl': { width: '100%', maxWidth: '90rem', maxHeight: '90dvh' },
    full: { width: '100%', height: '100%', maxWidth: '120rem', maxHeight: '80rem' },
};

const Header: FC<SlotProps> = ({ children, className, ...rest }) => (
    <div {...rest} className={twMerge('flex-none flex items-center gap-2.5 mb-2.5 pr-6', className)}>
        {children}
    </div>
);
Header.displayName = 'Modal.Header';

const Body: FC<SlotProps> = ({ children, className, ...rest }) => (
    <div {...rest} className={twMerge('flex-1 min-h-0 overflow-y-auto mb-4 text-xs text-gray-500 leading-relaxed custom-scrollbar', className)}>
        {children}
    </div>
);
Body.displayName = 'Modal.Body';

const Footer: FC<SlotProps> = ({ children, className, ...rest }) => (
    <div {...rest} className={twMerge('flex-none flex gap-2', className)}>
        {children}
    </div>
);
Footer.displayName = 'Modal.Footer';

const ActionButton: FC<ActionButtonProps> = ({ children, variant = 'brand', className, ...rest }) => (
    <button
        {...rest}
        className={twMerge(
            'flex-1 flex justify-center items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-all cursor-pointer outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
            variantClasses[variant],
            className,
        )}
    >
        <span className="flex flex-row flex-nowrap gap-2 justify-center items-center">{children}</span>
    </button>
);
ActionButton.displayName = 'Modal.ActionButton';

let openModalCount = 0;

const Modal: FC<ModalProps> & ModalComposition = ({
    open = true,
    keepMounted = false,
    children,
    className,
    onClose,
    size = 'sm',
    closeOnEscapeKeyDown = true,
    closeOnOutsideClick = true,
    protalClassName,
    closeButtonClassName,
}) => {
    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
    const [visible, setVisible] = useState(open);
    const [animate, setAnimate] = useState(open);

    useEffect(() => {
        setPortalNode(getPortalContainer());
    }, []);

    useEffect(() => {
        if (open) {
            setVisible(true);
            requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
        } else {
            setAnimate(false);
            const t = setTimeout(() => setVisible(false), 200);
            return () => clearTimeout(t);
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;

        openModalCount++;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        const originalOverflow = document.body.style.overflow;
        const originalPadding = document.body.style.paddingRight;

        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!closeOnEscapeKeyDown) return;
            if (e.key === 'Escape') onClose?.();
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            openModalCount--;
            if (openModalCount <= 0) {
                openModalCount = 0;
                document.body.style.overflow = originalOverflow;
                document.body.style.paddingRight = originalPadding;
            }
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onClose, closeOnEscapeKeyDown]);

    if (!portalNode || (!visible && !keepMounted)) return null;

    return createPortal(
        <div
            className={twMerge(
                'fixed inset-0 z-999 flex items-center justify-center p-4 sm:p-6',
                'transition-all duration-200',
                animate ? 'opacity-100' : 'opacity-0 pointer-events-none',
                !visible && keepMounted && 'hidden',
                protalClassName,
            )}
        >
            {/* Backdrop */}
            <div
                aria-hidden="true"
                className={twMerge(
                    'absolute inset-0 bg-black/30 backdrop-blur-sm',
                    'transition-opacity duration-200',
                    animate ? 'opacity-100' : 'opacity-0',
                    !closeOnOutsideClick ? 'pointer-events-none' : 'pointer-events-auto',
                )}
                onClick={closeOnOutsideClick ? onClose : undefined}
            />

            {/* Panel */}
            <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                style={modalStyles[size]}
                className={twMerge(
                    'relative shadow-xl flex flex-col rounded-md',
                    'bg-white transition-all duration-200 overflow-hidden',
                    'max-w-full max-h-full',
                    animate ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95',
                )}
            >
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className={twMerge(
                            'absolute! z-10 flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-500',
                            'hover:bg-gray-200 hover:text-gray-800 transition-colors cursor-pointer outline-none',
                            'focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1',
                            'right-1 top-1',
                            closeButtonClassName,
                        )}
                    >
                        <span>
                            <X size={14} strokeWidth={2.5} />
                        </span>
                    </button>
                )}

                <div className={twMerge('flex flex-col flex-1 w-full h-full overflow-hidden', className)}>{children}</div>
            </div>
        </div>,
        portalNode,
    );
};

Modal.Header = Header;
Modal.Body = Body;
Modal.Footer = Footer;
Modal.ActionButton = ActionButton;

export default Modal;
