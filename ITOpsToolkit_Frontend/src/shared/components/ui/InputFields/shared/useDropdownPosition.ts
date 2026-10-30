import { useState, useCallback, useEffect, type RefObject } from 'react';

export interface DropdownPosition {
    top: number | undefined;
    bottom: number | undefined;
    left: number;
    width: number;
    maxListHeight: number;
}

export function useDropdownPosition(triggerRef: RefObject<HTMLElement | null>, isOpen: boolean): { dropdownPos: DropdownPosition; updatePosition: () => void } {
    const [dropdownPos, setDropdownPos] = useState<DropdownPosition>({
        top: 0,
        bottom: undefined,
        left: 0,
        width: 0,
        maxListHeight: 192,
    });

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;

        const rect = triggerRef.current.getBoundingClientRect();
        const margin = 8;
        const gap = 4;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const fixedHeight = 46; // search bar + optional footer
        const minListHeight = 60;
        const defaultMaxList = 192;

        // Width: at least trigger width or 160, clamped to viewport
        const width = Math.min(Math.max(rect.width, 160), vw - margin * 2);

        // Horizontal: left-align to trigger, clamp to viewport
        let left = rect.left;
        left = Math.max(margin, Math.min(left, vw - width - margin));

        // Vertical: pick direction with more room
        const spaceBelow = vh - rect.bottom - gap - margin;
        const spaceAbove = rect.top - gap - margin;

        let top: number | undefined;
        let bottom: number | undefined;
        let maxListHeight: number;

        if (spaceBelow >= minListHeight + fixedHeight || spaceBelow >= spaceAbove) {
            top = rect.bottom + gap;
            bottom = undefined;
            maxListHeight = Math.min(defaultMaxList, spaceBelow - fixedHeight);
        } else {
            maxListHeight = Math.min(defaultMaxList, spaceAbove - fixedHeight);
            top = undefined;
            bottom = vh - rect.top + gap;
        }

        setDropdownPos({
            top,
            bottom,
            left,
            width,
            maxListHeight: Math.max(minListHeight, maxListHeight),
        });
    }, [triggerRef]);

    useEffect(() => {
        if (!isOpen) return;
        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen, updatePosition]);

    return { dropdownPos, updatePosition };
}
