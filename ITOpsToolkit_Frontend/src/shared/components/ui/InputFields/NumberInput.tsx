import { forwardRef, useRef, useEffect, type ComponentPropsWithoutRef } from 'react';
import { twMerge } from 'tailwind-merge';

const baseClasses =
    'w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs placeholder:text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
const errorClasses = 'border-red-400 focus:border-red-500 focus:ring-red-500';
const disabledClasses = 'bg-gray-50 text-gray-500 cursor-default select-text pointer-events-none';

type BaseProps = Omit<ComponentPropsWithoutRef<'input'>, 'onChange' | 'value' | 'type'>;

interface NumberInputProps extends BaseProps {
    value?: number | '';
    onChange?: (value: number | undefined) => void;
    error?: boolean;
    min?: number;
    max?: number;
    step?: number;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(({ value, onChange, error, disabled, min, max, step, className, ...rest }, ref) => {
    const disabledRef = useRef(disabled);
    useEffect(() => {
        disabledRef.current = disabled;
    }, [disabled]);

    const readOnlyProps = disabled ? { readOnly: true, tabIndex: -1, disabled: true } : {};

    return (
        <input
            ref={ref}
            type="number"
            value={value === undefined || value === null ? '' : String(value)}
            onChange={(e) => {
                if (disabledRef.current) return;
                const raw = e.target.value;
                onChange?.(raw === '' ? undefined : Number(raw));
            }}
            {...readOnlyProps}
            min={min}
            max={max}
            step={step}
            className={twMerge(baseClasses, error && errorClasses, disabled && disabledClasses, className)}
            {...rest}
        />
    );
});

NumberInput.displayName = 'NumberInput';

export default NumberInput;
