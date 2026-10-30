import type { FC, ComponentPropsWithoutRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface FieldLabelProps extends ComponentPropsWithoutRef<'label'> {
    label: string;
    required?: boolean;
}

const FieldLabel: FC<FieldLabelProps> = ({ label, required, className, ...rest }) => {
    return (
        <label className={twMerge('mb-0.5 block text-xs font-medium text-gray-700', className)} {...rest}>
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
    );
};

export default FieldLabel;
