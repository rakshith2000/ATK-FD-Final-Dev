import { type ReactNode } from 'react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';

interface KeyValueProps {
    children: ReactNode;
    className?: ClassNameValue;
}

const KeyValue = ({ children, className }: KeyValueProps) => <div className={twMerge('flex flex-row gap-0.5', className)}>{children}</div>;

interface KeyProps {
    children: ReactNode;
    className?: ClassNameValue;
}

const Key = ({ children, className }: KeyProps) => <span className={twMerge('text-xs font-medium text-(--brand-title-secondary-color)', className)}>{children}: </span>;

interface ValueProps {
    children: ReactNode;
    className?: ClassNameValue;
}

const Value = ({ children, className }: ValueProps) => <span className={twMerge('text-xs font-semibold text-(--brand-title-primary-color)', className)}>{children}</span>;

KeyValue.Key = Key;
KeyValue.Value = Value;

export default KeyValue;
