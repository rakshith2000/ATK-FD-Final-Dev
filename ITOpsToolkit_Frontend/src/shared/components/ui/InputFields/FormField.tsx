import { type FC, type ReactNode, useState, useCallback } from 'react';
import type { AnyFieldApi } from '@tanstack/react-form';
import { twMerge } from 'tailwind-merge';
import FieldError from './FieldError';

export type InputVariant = 'standard' | 'outlined' | 'filled';

/** Extract error status from a TanStack field */
function getFieldErrorStatus(field: AnyFieldApi): boolean {
    return !!field.state.meta.errors.length && field.state.meta.isTouched && !field.state.meta.isValid;
}

/** Extract error message from a TanStack field */
function getFieldErrorMessage(field: AnyFieldApi, limit: number = 1): string {
    return field.state.meta.errors
        .slice(0, limit)
        .map((e) => {
            if (!e) return '';
            if (typeof e === 'string') return e;
            if (typeof e === 'object' && e !== null && 'message' in e) return (e as { message: string }).message;
            return String(e);
        })
        .filter(Boolean)
        .join(', ');
}

export interface RenderProps {
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur: () => void;
    onFocus: () => void;
    hasError: boolean;
    errorMessage: string;
    disabled: boolean;
    readOnly: boolean;
    name: string;
    id: string;
    /** Extra className for the input element (border-0, bg-transparent etc. for outlined/filled) */
    inputClassName: string;
    /** Extra props to spread on the input for ARIA */
    inputProps: Record<string, string | undefined>;
    /** Whether the floating label is currently floating (focused or has value).
     *  Use this to conditionally show/hide placeholder in outlined/filled variants. */
    isFloating: boolean;
}

/** Props when using with TanStack Form field API */
interface FieldApiProps {
    field: AnyFieldApi;
    value?: never;
    onChange?: never;
    onBlur?: never;
    error?: never;
    errorText?: never;
}

/** Props when using standalone (no TanStack Form) */
interface StandaloneProps {
    field?: never;
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur?: () => void;
    error?: boolean;
    errorText?: string;
}

type FormFieldProps = (FieldApiProps | StandaloneProps) & {
    label?: string;
    required?: boolean;
    disabled?: boolean;
    name?: string;
    variant?: InputVariant;
    limitErrorsCount?: number;
    errorMinHeight?: number;
    className?: string;
    labelClassName?: string;
    errorClassName?: string;
    /** Outlined/filled variant: class for the fieldset border wrapper */
    fieldsetClassName?: string;
    children: (props: RenderProps) => ReactNode;
};

const FormField: FC<FormFieldProps> = ({
    field,
    value: valueProp,
    onChange: onChangeProp,
    onBlur: onBlurProp,
    error: errorProp,
    errorText: errorTextProp,
    label,
    required,
    disabled = false,
    name: nameProp,
    variant = 'standard',
    limitErrorsCount,
    errorMinHeight = 0,
    className,
    labelClassName,
    errorClassName,
    fieldsetClassName,
    children,
}) => {
    const [isFocused, setIsFocused] = useState(false);

    // Resolve from field API or raw props
    const value = field ? field.state.value : valueProp;
    const onChange = field ? (v: unknown) => field.handleChange(v as never) : onChangeProp!;
    const rawOnBlur = field ? field.handleBlur : (onBlurProp ?? (() => {}));
    const hasError = field ? getFieldErrorStatus(field) : (errorProp ?? false);
    const errorMessage = field ? (getFieldErrorStatus(field) ? getFieldErrorMessage(field, limitErrorsCount) : '') : (errorTextProp ?? '');
    const name = field?.name ?? nameProp ?? '';
    const id = name;

    const onBlur = useCallback(() => {
        setIsFocused(false);
        rawOnBlur();
    }, [rawOnBlur]);

    const onFocus = useCallback(() => {
        setIsFocused(true);
    }, []);

    // Determine if value is "filled" (non-empty) for floating label
    const hasValue = value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);
    const isFloating = isFocused || hasValue;

    const inputClassName = variant !== 'standard' ? 'peer' : '';
    const inputProps: Record<string, string | undefined> = {
        'aria-labelledby': label ? `${id}-label` : undefined,
    };

    if (variant === 'standard') {
        // Standard: label above, input below
        return (
            <div className={twMerge('w-full', className)}>
                {label && (
                    <label id={`${id}-label`} htmlFor={id} className={twMerge('mb-0.5 block text-xs font-medium text-gray-700', labelClassName)}>
                        {label}
                        {required && <span className="ml-0.5 text-red-500">*</span>}
                    </label>
                )}
                {children({ value, onChange, onBlur, onFocus, hasError, errorMessage, disabled, readOnly: disabled, name, id, inputClassName, inputProps, isFloating: true })}
                <FieldError error={hasError} message={errorMessage} minHeight={errorMinHeight} className={errorClassName} />
            </div>
        );
    }

    if (variant === 'outlined') {
        // Outlined: floating label inside a fieldset border
        return (
            <div className={twMerge('w-full', className)}>
                <div
                    className={twMerge(
                        'relative rounded-[5px] border bg-transparent transition-colors',
                        isFocused ? 'border-[1.5px] border-blue-500' : hasError ? 'border-red-400' : 'border-gray-300 hover:border-gray-400',
                        disabled && 'border-gray-200 bg-gray-50',
                        fieldsetClassName,
                    )}
                >
                    {label && (
                        <label
                            id={`${id}-label`}
                            htmlFor={id}
                            className={twMerge(
                                'absolute left-2 z-1 transition-all duration-150 pointer-events-none select-none origin-top-left',
                                isFloating ? '-top-2 scale-90 px-1 bg-white text-[0.6rem] font-medium' : 'top-1/2 -translate-y-1/2 text-xs',
                                isFocused ? 'text-blue-500' : hasError ? 'text-red-400' : 'text-gray-500',
                                disabled && 'text-gray-400',
                                labelClassName,
                            )}
                        >
                            {label}
                            {required && <span className="ml-0.5 text-red-500">*</span>}
                        </label>
                    )}
                    {children({
                        value,
                        onChange,
                        onBlur,
                        onFocus,
                        hasError,
                        errorMessage,
                        disabled,
                        readOnly: disabled,
                        name,
                        id,
                        inputClassName: twMerge(inputClassName, 'border-0 bg-transparent focus:ring-0 focus:outline-none'),
                        inputProps,
                        isFloating,
                    })}
                </div>
                <FieldError error={hasError} message={errorMessage} minHeight={errorMinHeight} className={errorClassName} />
            </div>
        );
    }

    // Filled: floating label inside a filled background
    return (
        <div className={twMerge('w-full', className)}>
            <div
                className={twMerge(
                    'relative rounded-t bg-gray-100 transition-colors',
                    'border-b-2',
                    isFocused ? 'border-b-blue-500' : hasError ? 'border-b-red-400' : 'border-b-gray-300 hover:border-b-gray-400',
                    disabled && 'bg-gray-50 border-b-gray-200',
                    fieldsetClassName,
                )}
            >
                {label && (
                    <label
                        id={`${id}-label`}
                        htmlFor={id}
                        className={twMerge(
                            'absolute left-2 z-1 transition-all duration-150 pointer-events-none select-none origin-top-left',
                            isFloating ? 'top-0.5 scale-90 text-[0.6rem] font-medium' : 'top-1/2 -translate-y-1/2 text-xs',
                            isFocused ? 'text-blue-500' : hasError ? 'text-red-400' : 'text-gray-500',
                            disabled && 'text-gray-400',
                            labelClassName,
                        )}
                    >
                        {label}
                        {required && <span className="ml-0.5 text-red-500">*</span>}
                    </label>
                )}
                {children({
                    value,
                    onChange,
                    onBlur,
                    onFocus,
                    hasError,
                    errorMessage,
                    disabled,
                    readOnly: disabled,
                    name,
                    id,
                    inputClassName: twMerge(inputClassName, 'border-0 bg-transparent focus:ring-0 focus:outline-none rounded-none', isFloating ? 'pt-4 pb-1' : 'py-2'),
                    inputProps,
                    isFloating,
                })}
            </div>
            <FieldError error={hasError} message={errorMessage} minHeight={errorMinHeight} className={errorClassName} />
        </div>
    );
};

export default FormField;
