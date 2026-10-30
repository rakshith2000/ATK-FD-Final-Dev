import { useCallback, useRef, useState } from 'react';

/**
 * Promise-based guard for unsaved changes.
 *
 * Call `confirm(shouldBlock)` before a destructive navigation or close.
 * - `shouldBlock = false` -> resolves immediately with `true` (no dialog).
 * - `shouldBlock = true`  -> opens a dialog; the Promise settles when
 *   the user clicks Discard (`proceed`) or Stay (`cancel`).
 */
export function useConfirmUnsavedChanges() {
    const [isOpen, setIsOpen] = useState(false);
    const resolverRef = useRef<((proceed: boolean) => void) | null>(null);

    const confirm = useCallback((shouldBlock: boolean): Promise<boolean> => {
        if (!shouldBlock) return Promise.resolve(true);

        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve;
            setIsOpen(true);
        });
    }, []);

    /** User chose to discard changes and continue. */
    const proceed = useCallback(() => {
        setIsOpen(false);
        resolverRef.current?.(true);
        resolverRef.current = null;
    }, []);

    /** User chose to stay and keep editing. */
    const cancel = useCallback(() => {
        setIsOpen(false);
        resolverRef.current?.(false);
        resolverRef.current = null;
    }, []);

    return { isOpen, confirm, proceed, cancel } as const;
}
