import { useEffect, type RefObject } from 'react';

/**
 * Calls `onClickOutside` when a mousedown occurs outside all provided refs.
 *
 * Uses `composedPath()` instead of `e.target` / `.contains()` so it works
 * correctly inside Shadow DOM - where event targets get retargeted to the
 * shadow host and `.contains()` would return false for elements inside the
 * shadow tree.
 *
 * @param refs - One or more refs whose elements are considered "inside"
 * @param onClickOutside - Callback fired when click lands outside all refs
 * @param enabled - Optional flag to enable/disable the listener (default: true)
 */
export function useClickOutside(refs: RefObject<Element | null> | RefObject<Element | null>[], onClickOutside: () => void, enabled = true): void {
    useEffect(() => {
        if (!enabled) return;

        const refArray = Array.isArray(refs) ? refs : [refs];

        const handler = (e: MouseEvent) => {
            const path = e.composedPath();
            const isInside = refArray.some((ref) => ref.current && path.includes(ref.current));
            if (!isInside) onClickOutside();
        };

        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [refs, onClickOutside, enabled]);
}
