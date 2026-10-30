import { useCallback, useRef } from 'react';

export function useDebouncedCallback<T extends (...args: never[]) => void>(callback: T, delay = 300): T & { cancel: () => void; flush: () => void } {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const callbackRef = useRef(callback);
    const lastArgsRef = useRef<Parameters<T> | null>(null);

    callbackRef.current = callback;

    const debounced = useCallback(
        (...args: Parameters<T>) => {
            lastArgsRef.current = args;
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                callbackRef.current(...(lastArgsRef.current as Parameters<T>));
                timerRef.current = null;
                lastArgsRef.current = null;
            }, delay);
        },
        [delay],
    );

    const cancel = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
        lastArgsRef.current = null;
    }, []);

    const flush = useCallback(() => {
        if (timerRef.current && lastArgsRef.current) {
            clearTimeout(timerRef.current);
            callbackRef.current(...lastArgsRef.current);
            timerRef.current = null;
            lastArgsRef.current = null;
        }
    }, []);

    return Object.assign(debounced, { cancel, flush }) as T & { cancel: () => void; flush: () => void };
}
