import { useMemo } from 'react';
import useResponsiveScreenSize from '@/shared/hooks/useResponsiveScreenSize';

interface UseResponsiveMaxChipsOptions {
    mobile?: number;
    tablet?: number;
    desktop?: number;
}

export function useResponsiveMaxChips({ mobile = 1, tablet = 2, desktop = 3 }: UseResponsiveMaxChipsOptions = {}): number {
    const { lt } = useResponsiveScreenSize();

    return useMemo(() => {
        if (lt('md')) return mobile;
        if (lt('xl')) return tablet;
        return desktop;
    }, [lt, mobile, tablet, desktop]);
}
