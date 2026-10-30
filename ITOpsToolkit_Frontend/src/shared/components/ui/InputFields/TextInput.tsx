import { forwardRef, useRef, useEffect, type ComponentPropsWithoutRef } from 'react';
import { twMerge } from 'tailwind-merge';

const baseClasses =
    'w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs placeholder:text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors';
const errorClasses = 'border-red-400 focus:border-red-500 focus:ring-red-500';
const disabledClasses = 'bg-gray-50 text-gray-500 cursor-default select-text pointer-events-none';

type BaseInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'onChange' | 'value'>;

interface TextInputProps extends BaseInputProps {
    value?: string;
    onChange?: (value: string) => void;
    error?: boolean;
    multiline?: boolean;
    rows?: number;
    maxLength?: number;
    showCharCount?: boolean;
    textareaClassName?: string;
}

const TextInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, TextInputProps>(
    ({ value = '', onChange, error, disabled, multiline, rows, maxLength, showCharCount, className, textareaClassName, ...rest }, ref) => {
        const strValue = (value as string) ?? '';

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

        // Stable ref for auto-sizing textareas - avoids re-running resize on every render
        const textareaElRef = useRef<HTMLTextAreaElement | null>(null);

        // Auto-resize on mount and when value changes (not on every re-render)
        useEffect(() => {
            if (multiline && rows === undefined && textareaElRef.current) {
                textareaElRef.current.style.height = 'auto';
                textareaElRef.current.style.height = `${textareaElRef.current.scrollHeight}px`;
            }
        }, [multiline, rows, strValue]);

        if (multiline) {
            // If rows is not provided, auto-size: no fixed rows, just fit content
            const textareaProps = rows !== undefined ? { rows } : { rows: 1, style: { minHeight: '2.5rem', overflow: 'hidden' } as React.CSSProperties };

            return (
                <div className="relative">
                    <textarea
                        ref={(el) => {
                            textareaElRef.current = el;
                            if (typeof ref === 'function') ref(el);
                            else if (ref) (ref as React.RefObject<HTMLTextAreaElement | null>).current = el;
                        }}
                        value={strValue}
                        onChange={(e) => {
                            guardedOnChange(e.target.value);
                            // Auto-resize on input when no rows specified
                            if (rows === undefined) {
                                e.target.style.height = 'auto';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                            }
                        }}
                        {...readOnlyProps}
                        maxLength={maxLength}
                        {...textareaProps}
                        className={twMerge(
                            baseClasses,
                            rows !== undefined && 'resize-y min-h-15',
                            error && errorClasses,
                            disabled && disabledClasses,
                            textareaClassName ?? className,
                        )}
                        {...(rest as ComponentPropsWithoutRef<'textarea'>)}
                    />
                    {showCharCount && maxLength !== undefined && (
                        <span className="absolute bottom-1 right-2 text-[10px] text-gray-400">
                            {strValue.length}/{maxLength}
                        </span>
                    )}
                </div>
            );
        }

        return (
            <div className="relative">
                <input
                    ref={ref as React.Ref<HTMLInputElement>}
                    type="text"
                    value={strValue}
                    onChange={(e) => guardedOnChange(e.target.value)}
                    {...readOnlyProps}
                    maxLength={maxLength}
                    className={twMerge(baseClasses, error && errorClasses, disabled && disabledClasses, className)}
                    {...rest}
                />
                {showCharCount && maxLength !== undefined && (
                    <span className="absolute bottom-1 right-2 text-[10px] text-gray-400">
                        {strValue.length}/{maxLength}
                    </span>
                )}
            </div>
        );
    },
);

TextInput.displayName = 'TextInput';

export default TextInput;
