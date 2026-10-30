import { forwardRef, useRef, useEffect, type ComponentPropsWithoutRef } from 'react';
import { twMerge } from 'tailwind-merge';

export type NumberRangeValue = [number | undefined, number | undefined];

type BaseProps = Omit<ComponentPropsWithoutRef<'input'>, 'onChange' | 'value' | 'type' | 'placeholder'>;

export interface NumberRangeInputProps extends BaseProps {
    value?: NumberRangeValue;
    onChange?: (value: NumberRangeValue) => void;
    error?: boolean;
    disabled?: boolean;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: [string?, string?];
}

const inputClasses = twMerge(
    'w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs placeholder:text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors',
    '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
);
const errorInputClasses = 'border-red-400 focus:border-red-500 focus:ring-red-500';
const disabledInputClasses = 'bg-gray-50 text-gray-500 cursor-default select-text pointer-events-none';

const NumberRangeInput = forwardRef<HTMLDivElement, NumberRangeInputProps>(
    ({ value = [undefined, undefined], onChange, error, disabled, min, max, step, placeholder = ['Min', 'Max'], className, ...rest }, ref) => {
        const [minVal, maxVal] = value;

        const disabledRef = useRef(disabled);
        useEffect(() => {
            disabledRef.current = disabled;
        }, [disabled]);

        const readOnlyProps = disabled ? { readOnly: true, tabIndex: -1, disabled: true } : {};

        const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (disabledRef.current) return;
            const raw = e.target.value;
            onChange?.([raw === '' ? undefined : Number(raw), maxVal]);
        };

        const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (disabledRef.current) return;
            const raw = e.target.value;
            onChange?.([minVal, raw === '' ? undefined : Number(raw)]);
        };

        return (
            <div ref={ref} className={twMerge('flex items-center gap-1.5', className)} {...rest}>
                <input
                    type="number"
                    value={minVal === undefined || minVal === null ? '' : String(minVal)}
                    onChange={handleMinChange}
                    {...readOnlyProps}
                    min={min}
                    max={max}
                    step={step}
                    placeholder={placeholder[0] ?? 'Min'}
                    className={twMerge(inputClasses, error && errorInputClasses, disabled && disabledInputClasses)}
                />
                <span className="text-[10px] text-gray-400 shrink-0">–</span>
                <input
                    type="number"
                    value={maxVal === undefined || maxVal === null ? '' : String(maxVal)}
                    onChange={handleMaxChange}
                    {...readOnlyProps}
                    min={min}
                    max={max}
                    step={step}
                    placeholder={placeholder[1] ?? 'Max'}
                    className={twMerge(inputClasses, error && errorInputClasses, disabled && disabledInputClasses)}
                />
            </div>
        );
    },
);

NumberRangeInput.displayName = 'NumberRangeInput';

export default NumberRangeInput;
