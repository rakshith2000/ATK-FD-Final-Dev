import type { FC, ReactNode, ComponentPropsWithoutRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface FieldWrapperProps extends ComponentPropsWithoutRef<'div'> {
    children: ReactNode;
}

const FieldWrapper: FC<FieldWrapperProps> = ({ children, className, ...rest }) => {
    return (
        <div className={twMerge('w-full', className)} {...rest}>
            {children}
        </div>
    );
};

export default FieldWrapper;
