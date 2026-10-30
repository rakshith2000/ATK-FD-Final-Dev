import { LoaderCircle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import type { MouseEventHandler, ReactNode } from 'react';

type Variant = 'brand' | 'primary' | 'secondary' | 'danger' | 'ghost' | 'pill-green' | 'pill-green-light';

const variantClasses: Record<Variant, string> = {
    primary: 'text-blue-500  border border-blue-200  bg-blue-50  hover:text-white hover:bg-blue-500/80  focus:text-white focus:bg-blue-500/80',
    secondary: 'text-gray-500  border border-gray-200  bg-gray-50 hover:bg-gray-50                       focus:bg-gray-50',
    danger: 'text-red-500   border border-red-200   bg-red-50 hover:text-white hover:bg-red-500/80   focus:text-white focus:bg-red-500/80',
    ghost: 'text-gray-500  border border-transparent bg-white hover:bg-gray-100                    focus:bg-gray-100',
    brand: 'text-white border-none border-transparent btn-split split-blue hover:scale-[1.01] active:scale-[0.98]',
    'pill-green': 'text-white  border-none border-transparent btn-split split-green hover:scale-[1.01] active:scale-[0.98]',
    'pill-green-light': 'text-(--change-arrow-text) btn-split split-white-green-light  border-none border-transparent hover:scale-[1.01] active:scale-[0.98]',
};

interface FormButtonProps {
    isSubmitting: boolean;
    disabled?: boolean;
    onClick: MouseEventHandler<HTMLButtonElement>;
    label: string;
    submittingLabel: string;
    icon?: ReactNode;
    className?: string;
    variant?: Variant;
    title?: string;
}

const FormActionButton = ({ isSubmitting, disabled = false, onClick, label, submittingLabel, icon, className = '', variant = 'brand', title }: FormButtonProps) => {
    return (
        <button
            type="button"
            title={title}
            disabled={disabled || isSubmitting}
            onClick={onClick}
            className={twMerge(
                'flex items-center justify-center gap-1.5 text-xs p-1.5 rounded-md min-w-full text-center font-semibold transition-all duration-150',
                'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer',
                variantClasses[variant],
                className,
            )}
        >
            <span className="flex flex-row flex-nowrap gap-2 justify-center items-center">
                {isSubmitting ? <LoaderCircle size={12} className="animate-spin" /> : icon}
                {isSubmitting ? submittingLabel : label}
            </span>
        </button>
    );
};

export default FormActionButton;
