import { twMerge } from 'tailwind-merge';

export interface ChangeDetailsTab<T extends string = string> {
    label: string;
    value: T;
}

interface ChangeDetailsTabsProps<T extends string = string> {
    tabs: Array<ChangeDetailsTab<T>>;
    activeTab: T;
    onTabChange: (value: T) => void;
    className?: string;
}

/**
 * Pill-style tab switcher used to move between the Details / Planning / Analysis
 * sections of a generated change. Purely presentational — the caller owns the active state.
 */
function ChangeDetailsTabs<T extends string = string>({ tabs, activeTab, onTabChange, className }: ChangeDetailsTabsProps<T>) {
    return (
        <div className={twMerge('flex items-center justify-center gap-2 flex-wrap', className)}>
            {tabs.map((tab) => {
                const isActive = tab.value === activeTab;
                return (
                    <button
                        key={tab.value}
                        type="button"
                        onClick={() => onTabChange(tab.value)}
                        aria-pressed={isActive}
                        className={twMerge(
                            'rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer border',
                            isActive
                                ? 'text-white border-transparent brand-btn-with-gradient-to-bottom shadow-sm'
                                : 'text-(--brand-title-primary-color) border-gray-200 bg-white hover:bg-gray-50',
                        )}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

export default ChangeDetailsTabs;
