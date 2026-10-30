import type { FC, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface FieldWrapperProps {
    label: string;
    required?: boolean;
    error?: string;
    isCheckbox?: boolean;
    isValidating?: boolean;
    labelClassName?: string;
    errorClassName?: string;
    children: ReactNode;
}

const FieldWrapper: FC<FieldWrapperProps> = ({ label, required, error, isCheckbox, isValidating, labelClassName, errorClassName, children }) => {
    const errorCls = `text-[10px] text-red-500 mt-0.5${errorClassName ? ` ${errorClassName}` : ''}`;

    if (isCheckbox) {
        return (
            <div>
                {children}
                {error && <p className={errorCls}>{error}</p>}
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-0.5">
                <label className={`text-xs font-medium text-gray-700${labelClassName ? ` ${labelClassName}` : ''}`}>
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {isValidating && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Loader2 size={10} className="animate-spin" />
                        Validating...
                    </span>
                )}
            </div>
            {children}
            {error && <p className={errorCls}>{error}</p>}
        </div>
    );
};

export default FieldWrapper;
