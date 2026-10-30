import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface FloatingLabelBoxProps {
    label: string;
    children?: ReactNode;
    className?: string;
    labelClassName?: string;
    contentClassName?: string;
}

function FloatingLabelBox({ label, children, className, labelClassName, contentClassName }: Readonly<FloatingLabelBoxProps>) {
    return (
        <div className={twMerge('relative mt-0 flex h-[80%] flex-col items-start justify-start rounded-lg border border-gray-400 p-2 pb-4 pt-6', className)}>
            <label className={twMerge('pointer-events-none absolute -top-2.5 left-4 select-none bg-white px-2 text-sm font-medium text-gray-800', labelClassName)}>{label}</label>

            <div className={twMerge('w-full', contentClassName)}>{children}</div>
        </div>
    );
}

export default FloatingLabelBox;
