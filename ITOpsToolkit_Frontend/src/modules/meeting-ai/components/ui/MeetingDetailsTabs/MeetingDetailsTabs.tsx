import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { RefreshCw } from 'lucide-react';

export type MeetingDetailsTab = 'Transcript' | 'Summary' | 'Knowledge Articles';

export const MEETING_DETAILS_TABS: MeetingDetailsTab[] = ['Summary', 'Transcript', 'Knowledge Articles'];

export interface MeetingDetailsTabsProps {
    activeTab: MeetingDetailsTab;
    onTabChange: (tab: MeetingDetailsTab) => void;
    onRefresh?: () => void;
    isRefreshing?: boolean;
    className?: ClassNameValue;
}

const MeetingDetailsTabs: React.FC<MeetingDetailsTabsProps> = ({ activeTab, onTabChange, onRefresh, isRefreshing, className }) => {
    return (
        <div className={twMerge('relative flex items-center justify-center gap-2 py-2 px-2', className)}>
            {MEETING_DETAILS_TABS.map((tab) => {
                const isActive = activeTab === tab;

                const baseStyles = 'relative overflow-visible px-4 py-1 rounded-full border text-xs font-semibold transition-all duration-150 cursor-pointer shadow-sm';
                const activeStyles = 'text-white bg-(--brand-color) border-[#34A8AA] soft-drop-shadow hover:scale-[1.01] active:scale-[0.98]';
                const inactiveStyles = 'bg-white text-(--brand-text-color) border-(--brand-border-color) hover:border-(--brand-color) hover:text-(--brand-color)';

                return (
                    <button key={tab} type="button" onClick={() => onTabChange(tab)} className={twMerge(baseStyles, isActive ? activeStyles : inactiveStyles)}>
                        {tab}
                        {isActive && (
                            <div className="absolute top-[100%] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-(--brand-color)" />
                        )}
                    </button>
                );
            })}
            {onRefresh && (
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    title="Refresh"
                    aria-label="Refresh meeting data"
                    className="absolute right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white border border-(--brand-border-color) text-(--brand-color) hover:border-(--brand-color) hover:bg-(--brand-color)/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
            )}
        </div>
    );
};

MeetingDetailsTabs.displayName = 'MeetingDetailsTabs';

export default MeetingDetailsTabs;
