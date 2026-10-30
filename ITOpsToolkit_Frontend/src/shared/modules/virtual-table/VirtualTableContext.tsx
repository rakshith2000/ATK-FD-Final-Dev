import { createContext, useContext } from 'react';
import type { RowData } from '@tanstack/react-table';
import type { VirtualTableContextValue } from './types';

const VirtualTableContext = createContext<VirtualTableContextValue<never> | null>(null);

export function useVirtualTableContext<TData extends RowData>(): VirtualTableContextValue<TData> {
    const ctx = useContext(VirtualTableContext);
    if (!ctx) {
        throw new Error('VirtualTable compound components must be used within a <VirtualTable> provider.');
    }
    return ctx as unknown as VirtualTableContextValue<TData>;
}

export default VirtualTableContext;
