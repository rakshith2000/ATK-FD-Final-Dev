import { ChevronDown } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getPortalContainer } from '@/shared/utils/get-portal-container';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import type { SnowTableName } from '../../../../../shared/modules/servicenow/types/ticket';
import { Tooltip } from '@mui/material';

export interface DropdownOption {
    label: string;
    value: SnowTableName;
}

interface TicketTypeDropdownButtonProps {
    options: DropdownOption[];
    selected?: DropdownOption;
    onSelect?: (option: DropdownOption) => void;
    className?: ClassNameValue;
    dropdownClassName?: ClassNameValue;
}

const TicketTypeDropdownButton: React.FC<TicketTypeDropdownButtonProps> = ({ options, selected: selectedProp, onSelect, className, dropdownClassName }) => {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<DropdownOption>(selectedProp ?? options[0]);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    const ref = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedProp) setSelected(selectedProp);
    }, [selectedProp]);

    const closeDropdown = useCallback(() => setOpen(false), []);
    useClickOutside([ref, dropdownRef], closeDropdown);

    useEffect(() => {
        if (open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + window.scrollY + 8,
                left: rect.right + window.scrollX,
                width: Math.max(rect.width, 144),
            });
        }
    }, [open]);

    const handleSelect = (option: DropdownOption) => {
        setSelected(option);
        onSelect?.(option);
        setOpen(false);
    };

    return (
        <div ref={ref} className="relative">
            <Tooltip arrow placement="bottom" title="Ticket Type">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setOpen((prev) => !prev)}
                    className={twMerge('flex items-center gap-1 text-xs font-bold cursor-pointer', className)}
                >
                    <span>{selected.label}</span>
                    <ChevronDown size={16} className={twMerge('transition-transform duration-200', open && 'rotate-180')} />
                </button>
            </Tooltip>

            {open &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        style={{
                            position: 'absolute',
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            minWidth: dropdownPos.width,
                            transform: 'translateX(-100%)',
                            zIndex: 99999,
                        }}
                        className={twMerge('bg-white rounded-lg shadow-lg border border-gray-100 py-1', dropdownClassName)}
                    >
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelect(option)}
                                className={twMerge(
                                    'w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer',
                                    selected.value === option.value && 'bg-gray-50 font-semibold',
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>,
                    getPortalContainer(),
                )}
        </div>
    );
};

export default TicketTypeDropdownButton;
