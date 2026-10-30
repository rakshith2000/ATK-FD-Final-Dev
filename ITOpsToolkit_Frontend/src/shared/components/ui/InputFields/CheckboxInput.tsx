import { forwardRef, useRef, useEffect, type ComponentPropsWithoutRef } from 'react';
import { twMerge } from 'tailwind-merge';

type BaseProps = Omit<ComponentPropsWithoutRef<'input'>, 'onChange' | 'value' | 'type' | 'checked'>;

interface CheckboxInputProps extends BaseProps {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    error?: boolean;
    label?: string;
    labelClassName?: string;
}

const CheckboxInput = forwardRef<HTMLInputElement, CheckboxInputProps>(({ checked = false, onChange, error, disabled, label, className, labelClassName, ...rest }, ref) => {
    const disabledRef = useRef(disabled);
    useEffect(() => {
        disabledRef.current = disabled;
    }, [disabled]);

    return (
        <label
            className={twMerge(
                'inline-flex items-center gap-2 text-xs cursor-pointer select-none',
                disabled && 'opacity-60 cursor-not-allowed pointer-events-none',
                error && 'text-red-500',
                labelClassName,
            )}
        >
            <input
                ref={ref}
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                    if (disabledRef.current) return;
                    onChange?.(e.target.checked);
                }}
                disabled={disabled}
                className={twMerge(
                    'rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors',
                    error && 'border-red-400 text-red-500 focus:ring-red-500',
                    disabled && 'cursor-not-allowed',
                    className,
                )}
                aria-invalid={error || undefined}
                {...rest}
            />
            {label}
        </label>
    );
});

CheckboxInput.displayName = 'CheckboxInput';

export default CheckboxInput;
