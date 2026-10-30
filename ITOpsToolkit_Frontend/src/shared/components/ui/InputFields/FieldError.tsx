import type { FC, ComponentPropsWithoutRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface FieldErrorProps extends ComponentPropsWithoutRef<'p'> {
    error?: boolean;
    message?: string;
    minHeight?: number;
}

const FieldError: FC<FieldErrorProps> = ({ error, message, minHeight = 0, className, ...rest }) => {
    return (
        <p
            role="alert"
            aria-live="polite"
            className={twMerge(
                'ml-1 mr-1 flex items-start wrap-break-word whitespace-pre-line text-[0.65rem] font-medium',
                error && message ? 'text-red-500' : 'text-transparent',
                className,
            )}
            style={{ minHeight: `${minHeight}px` }}
            {...rest}
        >
            {error ? message : ''}
        </p>
    );
};

export default FieldError;
