import { ChevronDown, ChevronRight } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getPortalContainer } from '@/shared/utils/get-portal-container';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { Tooltip } from '@mui/material';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';

interface TicketStatePriorityDropdownButtonProps {
    tickets: SnowTicket[];
    stateChoices: Array<{ value: string; label: string }>;
    selectedState: string | null;
    selectedPriority: string | null;
    onSelectFilters: (state: string | null, priority: string | null) => void;
    isLoading?: boolean;
    className?: ClassNameValue;
    dropdownClassName?: ClassNameValue;
}

/**
 * Service Request multilevel State / Priority filter dropdown.
 *
 * Ported from Incident AI's `IncidentStatePriorityDropdownButton`: a top-level
 * menu of States and Priorities (with live counts derived from the loaded
 * tickets), each opening a hover submenu for the nested State×Priority
 * combination. Counts reflect the tickets currently loaded in the list.
 */
const TicketStatePriorityDropdownButton: React.FC<TicketStatePriorityDropdownButtonProps> = ({
    tickets,
    stateChoices,
    selectedState,
    selectedPriority,
    onSelectFilters,
    isLoading,
    className,
    dropdownClassName,
}) => {
    const [open, setOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    const [activeSubmenu, setActiveSubmenu] = useState<{
        type: 'state' | 'priority';
        value: string;
        label: string;
        top: number;
        left: number;
    } | null>(null);

    const ref = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const submenuRef = useRef<HTMLDivElement>(null);

    const closeDropdown = useCallback(() => {
        setOpen(false);
        setActiveSubmenu(null);
    }, []);

    useClickOutside([ref, dropdownRef, submenuRef], closeDropdown);

    useEffect(() => {
        if (open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + window.scrollY + 8,
                left: rect.right + window.scrollX,
                width: Math.max(rect.width, 220),
            });
        }
    }, [open]);

    const handleItemMouseEnter = (type: 'state' | 'priority', value: string, label: string, e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const spaceOnRight = window.innerWidth - rect.right;
        const submenuWidth = 210;

        let left = rect.right + 4 + window.scrollX;
        if (spaceOnRight < submenuWidth && rect.left >= submenuWidth) {
            left = rect.left - submenuWidth - 4 + window.scrollX;
        }

        setActiveSubmenu({
            type,
            value,
            label,
            top: rect.top + window.scrollY,
            left,
        });
    };

    const ticketsList = tickets ?? [];
    const choices = stateChoices ?? [];
    const totalCount = ticketsList.length;

    // Compute top-level state options counts
    const stateCounts: Record<string, number> = {};
    for (const ticket of ticketsList) {
        const stateVal = ticket.state?.value ?? '';
        stateCounts[stateVal] = (stateCounts[stateVal] ?? 0) + 1;
    }

    // Build state labels from the loaded tickets, then let the official choices
    // override them. sc_request inherits some state choices from its parent
    // (task) table, so the sys_choice lookup can miss states (e.g. Open, Pending)
    // that are still present on the tickets. Deriving labels from the tickets too
    // guarantees every state actually in the list is filterable.
    const stateLabels: Record<string, string> = {};
    for (const ticket of ticketsList) {
        const val = ticket.state?.value;
        const label = ticket.state?.display_value;
        if (val && label) stateLabels[val] = label;
    }
    for (const c of choices) {
        stateLabels[c.value] = c.label;
    }

    // Preserve the official choice ordering, then append states that only appear
    // on the loaded tickets.
    const orderedStateValues: string[] = [];
    const seenStateValues = new Set<string>();
    for (const c of choices) {
        if (!seenStateValues.has(c.value)) {
            seenStateValues.add(c.value);
            orderedStateValues.push(c.value);
        }
    }
    for (const ticket of ticketsList) {
        const val = ticket.state?.value ?? '';
        if (val && !seenStateValues.has(val)) {
            seenStateValues.add(val);
            orderedStateValues.push(val);
        }
    }

    const stateOptions = orderedStateValues
        .map((value) => ({
            value,
            label: stateLabels[value] ?? value,
            count: stateCounts[value] ?? 0,
        }))
        .filter((opt) => opt.count > 0);

    // Compute priority counts and labels
    const standardPriorities = [
        { value: '1', label: 'P1' },
        { value: '2', label: 'P2' },
        { value: '3', label: 'P3' },
        { value: '4', label: 'P4' },
        { value: '5', label: 'P5' },
    ];

    const priorityLabels: Record<string, string> = {};
    for (const p of standardPriorities) {
        priorityLabels[p.value] = p.label;
    }
    for (const ticket of ticketsList) {
        const val = ticket.priority?.value;
        const label = ticket.priority?.display_value;
        if (val && label) {
            priorityLabels[val] = label;
        }
    }

    const priorityCounts: Record<string, number> = {};
    for (const ticket of ticketsList) {
        const priorityVal = ticket.priority?.value ?? '';
        priorityCounts[priorityVal] = (priorityCounts[priorityVal] ?? 0) + 1;
    }

    const priorityOptions = Object.entries(priorityLabels)
        .map(([value, label]) => ({
            value,
            label,
            count: priorityCounts[value] ?? 0,
        }))
        .filter((opt) => opt.count > 0);

    // Compute nested counts
    const nestedCounts: Record<string, Record<string, number>> = {};
    const nestedCountsByState: Record<string, Record<string, number>> = {};

    for (const ticket of ticketsList) {
        const pVal = ticket.priority?.value ?? '';
        const sVal = ticket.state?.value ?? '';

        if (!nestedCounts[pVal]) nestedCounts[pVal] = {};
        nestedCounts[pVal][sVal] = (nestedCounts[pVal][sVal] ?? 0) + 1;

        if (!nestedCountsByState[sVal]) nestedCountsByState[sVal] = {};
        nestedCountsByState[sVal][pVal] = (nestedCountsByState[sVal][pVal] ?? 0) + 1;
    }

    const getActiveFilterLabel = () => {
        if (selectedState && selectedPriority) {
            const stateLabel = stateLabels[selectedState] ?? selectedState;
            const priorityLabel = standardPriorities.find((sp) => sp.value === selectedPriority)?.label ?? selectedPriority;
            return `${priorityLabel} / ${stateLabel}`;
        }
        if (selectedState) {
            return stateLabels[selectedState] ?? selectedState;
        }
        if (selectedPriority) {
            return priorityLabels[selectedPriority] ?? selectedPriority;
        }
        return 'All';
    };

    const getActiveFilterCount = () => {
        if (selectedState && selectedPriority) {
            return nestedCounts[selectedPriority]?.[selectedState] ?? 0;
        }
        if (selectedState) {
            return stateCounts[selectedState] ?? 0;
        }
        if (selectedPriority) {
            return priorityCounts[selectedPriority] ?? 0;
        }
        return totalCount;
    };

    return (
        <div ref={ref} className="relative">
            <Tooltip arrow placement="bottom" title="Filter by State / Priority">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => {
                        setOpen((prev) => !prev);
                        setActiveSubmenu(null);
                    }}
                    disabled={isLoading || totalCount === 0}
                    className={twMerge(
                        'flex items-center gap-1 text-xs font-bold cursor-pointer select-none px-2.5 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors',
                        isLoading && 'opacity-50 cursor-not-allowed',
                        'disabled:cursor-not-allowed',
                        className,
                    )}
                >
                    <span>{getActiveFilterLabel()}</span>
                    <span className="text-[0.65rem] font-semibold gradient-text">({getActiveFilterCount()})</span>
                    <ChevronDown size={14} className={twMerge('transition-transform duration-200', open && 'rotate-180')} />
                </button>
            </Tooltip>

            {/* Main Dropdown Portal */}
            {open &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        style={{
                            position: 'absolute',
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            minWidth: 220,
                            transform: 'translateX(-100%)',
                            zIndex: 99999,
                        }}
                        className={twMerge('bg-white rounded-lg shadow-lg border border-gray-100 py-1 max-h-[80vh] overflow-y-auto select-none', dropdownClassName)}
                    >
                        <div className="flex flex-col text-xs text-gray-700">
                            {/* Clear Filters Option */}
                            <button
                                type="button"
                                onClick={() => {
                                    onSelectFilters(null, null);
                                    closeDropdown();
                                }}
                                className={twMerge(
                                    'w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 flex items-center justify-between font-medium cursor-pointer',
                                    !selectedState && !selectedPriority && 'bg-blue-50/50 text-blue-600 font-semibold',
                                )}
                            >
                                <span>All Tickets</span>
                                <span className="text-[0.65rem] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{totalCount}</span>
                            </button>

                            {/* States Section */}
                            <div className="px-3 py-1 text-[0.6rem] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">States</div>
                            {stateOptions.map((opt) => (
                                <div key={opt.value} className="relative" onMouseEnter={(e) => handleItemMouseEnter('state', opt.value, opt.label, e)}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onSelectFilters(opt.value, null);
                                            closeDropdown();
                                        }}
                                        className={twMerge(
                                            'w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center justify-between cursor-pointer',
                                            selectedState === opt.value && !selectedPriority && 'bg-blue-50/50 text-blue-600 font-semibold',
                                        )}
                                    >
                                        <span className="flex items-center gap-1">
                                            <span>{opt.label}</span>
                                            <ChevronRight size={12} className="text-gray-400 opacity-60" />
                                        </span>
                                        <span className="text-[0.65rem] font-semibold text-gray-500">{opt.count}</span>
                                    </button>
                                </div>
                            ))}

                            {/* Priorities Section */}
                            <div className="px-3 py-1 text-[0.6rem] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 border-t border-gray-100">Priorities</div>
                            {priorityOptions.map((opt) => (
                                <div key={opt.value} className="relative" onMouseEnter={(e) => handleItemMouseEnter('priority', opt.value, opt.label, e)}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onSelectFilters(null, opt.value);
                                            closeDropdown();
                                        }}
                                        className={twMerge(
                                            'w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center justify-between cursor-pointer',
                                            selectedPriority === opt.value && !selectedState && 'bg-blue-50/50 text-blue-600 font-semibold',
                                        )}
                                    >
                                        <span className="flex items-center gap-1">
                                            <span>{opt.label}</span>
                                            <ChevronRight size={12} className="text-gray-400 opacity-60" />
                                        </span>
                                        <span className="text-[0.65rem] font-semibold text-gray-500">{opt.count}</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>,
                    getPortalContainer(),
                )}

            {/* Hover Submenu Portal (Rendered outside to avoid clipping) */}
            {open &&
                activeSubmenu &&
                createPortal(
                    <div
                        ref={submenuRef}
                        style={{
                            position: 'absolute',
                            top: activeSubmenu.top,
                            left: activeSubmenu.left,
                            width: 210,
                            zIndex: 100000,
                        }}
                        className="bg-white border border-gray-200 shadow-xl rounded-lg py-1 text-xs select-none max-h-[60vh] overflow-y-auto"
                    >
                        <div className="px-3 py-1 text-[0.6rem] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                            {activeSubmenu.type === 'state' ? `Priority (in ${activeSubmenu.label})` : `State (in ${activeSubmenu.label})`}
                        </div>
                        {activeSubmenu.type === 'state'
                            ? priorityOptions.map((p) => {
                                  const nestedCount = nestedCountsByState[activeSubmenu.value]?.[p.value] ?? 0;
                                  if (nestedCount === 0) return null;
                                  return (
                                      <button
                                          key={p.value}
                                          type="button"
                                          onClick={() => {
                                              onSelectFilters(activeSubmenu.value, p.value);
                                              closeDropdown();
                                          }}
                                          className={twMerge(
                                              'w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center justify-between cursor-pointer transition-colors',
                                              selectedState === activeSubmenu.value && selectedPriority === p.value && 'bg-blue-50 text-blue-600 font-semibold',
                                          )}
                                      >
                                          <span>{p.label}</span>
                                          <span className="text-[0.65rem] font-semibold text-gray-500">{nestedCount}</span>
                                      </button>
                                  );
                              })
                            : stateOptions.map((s) => {
                                  const nestedCount = nestedCounts[activeSubmenu.value]?.[s.value] ?? 0;
                                  if (nestedCount === 0) return null;
                                  return (
                                      <button
                                          key={s.value}
                                          type="button"
                                          onClick={() => {
                                              onSelectFilters(s.value, activeSubmenu.value);
                                              closeDropdown();
                                          }}
                                          className={twMerge(
                                              'w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center justify-between cursor-pointer transition-colors',
                                              selectedState === s.value && selectedPriority === activeSubmenu.value && 'bg-blue-50 text-blue-600 font-semibold',
                                          )}
                                      >
                                          <span>{s.label}</span>
                                          <span className="text-[0.65rem] font-semibold text-gray-500">{nestedCount}</span>
                                      </button>
                                  );
                              })}
                    </div>,
                    getPortalContainer(),
                )}
        </div>
    );
};

export default TicketStatePriorityDropdownButton;
