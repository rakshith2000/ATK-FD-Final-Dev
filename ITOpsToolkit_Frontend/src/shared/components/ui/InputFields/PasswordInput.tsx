import { forwardRef, useRef, useEffect, useState, type ComponentPropsWithoutRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { Eye, EyeOff } from 'lucide-react';

const baseClasses =
    'w-full rounded border border-gray-300 bg-white px-2 py-1 pr-8 text-xs placeholder:text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors';
const errorClasses = 'border-red-400 focus:border-red-500 focus:ring-red-500';
const disabledClasses = 'bg-gray-50 text-gray-500 cursor-default select-text pointer-events-none';

type BaseInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'onChange' | 'value' | 'type'>;

interface PasswordInputProps extends BaseInputProps {
    value?: string;
    onChange?: (value: string) => void;
    error?: boolean;
    maxLength?: number;
    showCharCount?: boolean;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(({ value = '', onChange, error, disabled, maxLength, showCharCount, className, ...rest }, ref) => {
    const strValue = (value as string) ?? '';
    const [visible, setVisible] = useState(false);

    // Track disabled via ref so DOM manipulation cannot bypass the guard
    const disabledRef = useRef(disabled);
    useEffect(() => {
        disabledRef.current = disabled;
    }, [disabled]);

    const guardedOnChange = (newValue: string) => {
        if (disabledRef.current) return;
        onChange?.(newValue);
    };

    // Use readOnly instead of native disabled so Tailwind text colors apply and users can select & copy text
    const readOnlyProps = disabled ? { readOnly: true, tabIndex: -1, disabled: true } : {};

    return (
        <div className="relative">
            <input
                ref={ref}
                type={visible ? 'text' : 'password'}
                value={strValue}
                onChange={(e) => guardedOnChange(e.target.value)}
                {...readOnlyProps}
                maxLength={maxLength}
                className={twMerge(baseClasses, error && errorClasses, disabled && disabledClasses, className)}
                {...rest}
            />
            {!disabled && (
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setVisible((v) => !v)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={visible ? 'Hide password' : 'Show password'}
                >
                    {visible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
            )}
            {showCharCount && maxLength !== undefined && (
                <span className="absolute bottom-1 right-8 text-[10px] text-gray-400">
                    {strValue.length}/{maxLength}
                </span>
            )}
        </div>
    );
});

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
