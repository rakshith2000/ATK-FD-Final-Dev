import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Filter } from 'lucide-react';
import { getPortalContainer } from '@/shared/utils/get-portal-container';
import IncidentAdvancedFilters from '../../smart/IncidentAdvancedFilters/IncidentAdvancedFilters';

interface IncidentFilterButtonProps {
    stagedPriorities: string[];
    onStagedPrioritiesChange: (priorities: string[]) => void;
    stagedStates: string[];
    onStagedStatesChange: (states: string[]) => void;
    stagedGroups: string[];
    onStagedGroupsChange: (groups: string[]) => void;
    selectedPriorities: string[];
    selectedStates: string[];
    selectedGroups: string[];
    defaultOptions: {
        stagedPriorities: string[];
        selectedPriorities: string[];
        stagedStates: string[];
        selectedStates: string[];
        stagedGroups: string[];
        selectedGroups: string[];
    };
    onApply: () => void;
    onReset: () => void;
}

export const IncidentFilterButton = ({
    stagedPriorities,
    onStagedPrioritiesChange,
    stagedStates,
    onStagedStatesChange,
    stagedGroups,
    onStagedGroupsChange,
    selectedPriorities,
    selectedStates,
    selectedGroups,
    defaultOptions,
    onApply,
    onReset,
}: IncidentFilterButtonProps) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const filterButtonRef = useRef<HTMLButtonElement>(null);
    const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    const updatePopoverPosition = () => {
        if (filterButtonRef.current) {
            const rect = filterButtonRef.current.getBoundingClientRect();
            const portalContainer = getPortalContainer();
            const portalRect = portalContainer.getBoundingClientRect();

            // Position popover below the button, aligning its right edge flush with the button's right edge
            setPopoverCoords({
                top: rect.bottom - portalRect.top + portalContainer.scrollTop + 6,
                left: rect.right - portalRect.left + portalContainer.scrollLeft,
            });
        }
    };

    useEffect(() => {
        if (isPopoverOpen) {
            updatePopoverPosition();

            const handleOutsideClick = (e: MouseEvent) => {
                const target = e.target as HTMLElement;
                if (!target.isConnected) return;
                if (
                    filterButtonRef.current?.contains(target) ||
                    document.getElementById('mim-advanced-filters-popover')?.contains(target) ||
                    target.closest('[data-portal-dropdown="true"]')
                ) {
                    return;
                }
                setIsPopoverOpen(false);
            };

            window.addEventListener('resize', updatePopoverPosition);
            document.addEventListener('mousedown', handleOutsideClick);

            return () => {
                window.removeEventListener('resize', updatePopoverPosition);
                document.removeEventListener('mousedown', handleOutsideClick);
            };
        }
    }, [isPopoverOpen]);

    // Reset staged selections to currently applied values when popover closes
    useEffect(() => {
        if (!isPopoverOpen) {
            onStagedPrioritiesChange(selectedPriorities);
            onStagedStatesChange(selectedStates);
            onStagedGroupsChange(selectedGroups);
        }
    }, [isPopoverOpen, selectedPriorities, selectedStates, selectedGroups, onStagedPrioritiesChange, onStagedStatesChange, onStagedGroupsChange]);

    const hasActiveAdvancedFilters =
        selectedPriorities.toLocaleString() !== defaultOptions.selectedPriorities.toLocaleString() ||
        selectedStates.toLocaleString() !== defaultOptions.selectedStates.toLocaleString() ||
        selectedGroups.toLocaleString() !== defaultOptions.selectedGroups.toLocaleString();

    return (
        <>
            <style>{`
                @keyframes popoverIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateX(-100%) translateY(-0.25rem);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateX(-100%) translateY(0);
                    }
                }
                .animate-popover {
                    animation: popoverIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    transform-origin: top right;
                }
            `}</style>

            <button
                ref={filterButtonRef}
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                className={`px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer rounded-xl shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10 ${
                    isPopoverOpen || hasActiveAdvancedFilters
                        ? 'border-blue-500/40 bg-blue-50 text-blue-700 ring-2 ring-blue-500/10 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                }`}
                title="Advanced Filters"
            >
                <Filter size={13} className={hasActiveAdvancedFilters ? 'text-blue-600' : 'text-slate-500'} />
                <span>Filters</span>
                {hasActiveAdvancedFilters && <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />}
            </button>

            {/* Popover Portal */}
            {isPopoverOpen &&
                createPortal(
                    <div
                        id="mim-advanced-filters-popover"
                        className="absolute z-9999 animate-popover"
                        style={{
                            top: popoverCoords.top,
                            left: popoverCoords.left,
                        }}
                    >
                        <IncidentAdvancedFilters
                            stagedStates={stagedStates}
                            onStagedStatesChange={onStagedStatesChange}
                            stagedPriorities={stagedPriorities}
                            onStagedPrioritiesChange={onStagedPrioritiesChange}
                            onStagedAssignmentGroupsChange={onStagedGroupsChange}
                            stagedAssignmentGroups={stagedGroups}
                            onApply={() => {
                                onApply();
                                setIsPopoverOpen(false);
                            }}
                            onReset={() => {
                                onReset();
                                setIsPopoverOpen(false);
                            }}
                            disableSubmit={stagedPriorities.length === 0 || stagedStates.length === 0}
                            onCancel={() => setIsPopoverOpen(false)}
                        />
                    </div>,
                    getPortalContainer(),
                )}
        </>
    );
};

export default IncidentFilterButton;
