import type { FC } from 'react';
import { twMerge } from 'tailwind-merge';
import { useVirtualTableContext } from '../VirtualTableContext';
import type { ToolbarProps } from '../types';

const Toolbar: FC<ToolbarProps> = ({ children, className }) => {
    const { classNames } = useVirtualTableContext();

    return <div className={twMerge('flex flex-wrap justify-end items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2', classNames.toolbar, className)}>{children}</div>;
};

Toolbar.displayName = 'VirtualTable.Toolbar';
export default Toolbar;
