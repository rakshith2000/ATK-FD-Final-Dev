import { useCallback, useEffect, useState } from 'react';
import { useDebouncedCallback } from '@/shared/hooks/useDebouncedCallback';

export function useDebouncedSearchInput(committedValue: string, onCommit: (value: string) => void, debounceMs = 300) {
    const [inputValue, setInputValue] = useState(committedValue);

    const debouncedCommit = useDebouncedCallback(onCommit, debounceMs);

    useEffect(() => () => debouncedCommit.flush(), [debouncedCommit]);

    useEffect(() => {
        setInputValue(committedValue);
    }, [committedValue]);

    const onChange = useCallback(
        (value: string) => {
            setInputValue(value);
            debouncedCommit(value);
        },
        [debouncedCommit],
    );

    const onSubmit = useCallback(() => {
        debouncedCommit.flush();
    }, [debouncedCommit]);

    const reset = useCallback(() => {
        debouncedCommit.cancel();
        setInputValue(committedValue);
    }, [debouncedCommit, committedValue]);

    const clear = useCallback(() => {
        debouncedCommit.cancel();
        setInputValue('');
    }, [debouncedCommit]);

    return { inputValue, onChange, onSubmit, reset, clear };
}
