import type React from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { twMerge } from 'tailwind-merge';
import IncidentTiles, { type IncidentTile } from '../IncidentTiles/IncidentTiles';

export interface IncidentCommandStripProps {
    priorityValue: string;
    priorityLabel: string;
    title: string;
    /** Incident id shown first in the meta row (mono, brand blue). */
    incidentId: string;
    /** Remaining meta items rendered after the id, separated by a divider. */
    metaItems: string[];
    /** State display value, shown as the incident status chip. */
    statusLabel: string;
    tiles: IncidentTile[];
    /** Elapsed clock string "HH:MM:SS" derived from opened_at. */
    elapsed?: string;
    /** ServiceNow incident link URL. */
    serviceNowLink?: string;
    /** Whether refresh is in progress. */
    isRefreshing?: boolean;
    /** Callback when refresh button is clicked. */
    onRefresh?: () => void;
}

// .pri-badge — P1 breach red, P2 active orange, P3 brand blue.
const priorityBadgeClass: Record<string, string> = {
    '1': 'bg-[#C0271F]',
    '2': 'bg-[#B26B00]',
    '3': 'bg-[#0033A0]',
    '4': 'bg-[#1E4FBF]',
    '5': 'bg-[#8A94A8]',
};

// .state-chip — tinted bg + coloured text + subtle border, keyed off the state label.
const stateChipStyle = (label: string): string => {
    const key = label.toLowerCase().trim();
    if (key.includes('resolv') || key.includes('closed')) return 'bg-[#E6F4EC] text-[#0E7C4A] border-[#0E7C4A]/25';
    if (key.includes('progress')) return 'bg-[#FDF3E2] text-[#B26B00] border-[#B26B00]/25';
    if (key.includes('hold') || key.includes('pending')) return 'bg-[#F0F2F6] text-[#4B5568] border-[#C3CDDE]';
    if (key.includes('new')) return 'bg-[#E8EEFA] text-[#0033A0] border-[#0033A0]/20';
    return 'bg-[#F0F2F6] text-[#4B5568] border-[#C3CDDE]';
};

/**
 * Command strip — priority badge, incident title, meta row and the KPI tile grid.
 * Mirrors the `.command` region of the shared HTML mockup.
 */
const IncidentCommandStrip: React.FC<IncidentCommandStripProps> = ({
    priorityValue,
    priorityLabel,
    title,
    incidentId,
    metaItems,
    statusLabel,
    tiles,
    elapsed,
    serviceNowLink,
    isRefreshing,
    onRefresh,
}) => {
    const badgeClass = priorityBadgeClass[priorityValue] ?? 'bg-[#0033A0]';

    const actionBtnClass =
        'inline-flex items-center gap-1.5 rounded-[5px] border border-gray-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50';

    return (
        <section className="bg-white border-b border-[#DCE3EE]">
            <div className="px-6 py-[18px]">
                <div className="flex items-start gap-4 flex-wrap mb-4">
                    <span
                        className={twMerge('font-mono font-bold text-[18px] leading-none tracking-[-0.02em] text-white rounded-[5px] px-[13px] py-[6px] shrink-0', badgeClass)}
                        title={priorityLabel}
                    >
                        {`P${priorityValue || '?'}`}
                    </span>

                    <div className="flex-1 min-w-[280px]">
                        <div className="flex items-start gap-3 justify-between">
                            <div className="flex-1">
                                <h2 className="text-[19px] font-semibold text-[#12182B] tracking-[-0.015em] leading-[1.3]">{title || 'Untitled incident'}</h2>
                                <div className="mt-[5px] flex items-center gap-2 flex-wrap text-[12.5px] text-[#4B5568]">
                                    <span className="font-mono font-semibold text-[#0033A0]">{incidentId}</span>
                                    {metaItems.map((m, i) => (
                                        <span key={`${m}-${i}`} className="flex items-center gap-2">
                                            <span className="text-[#C3CDDE]">/</span>
                                            <span>{m}</span>
                                        </span>
                                    ))}
                                    {statusLabel && (
                                        <span
                                            className={twMerge(
                                                'ml-1 inline-flex items-center text-[10.5px] font-bold uppercase tracking-[0.1em] px-[9px] py-[3px] rounded-[3px] border',
                                                stateChipStyle(statusLabel),
                                            )}
                                        >
                                            {statusLabel}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Action buttons on the right */}
                            <div className="flex items-center gap-2 flex-wrap shrink-0">
                                {onRefresh && (
                                    <button type="button" onClick={onRefresh} className={actionBtnClass} disabled={isRefreshing}>
                                        <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                                        Refresh
                                    </button>
                                )}
                                {serviceNowLink && (
                                    <Link to={serviceNowLink} target="_blank" className={actionBtnClass}>
                                        <ExternalLink size={13} />
                                        View in ServiceNow
                                    </Link>
                                )}
                                {elapsed && (
                                    <div className={twMerge(actionBtnClass, 'flex-col items-start gap-0 py-1')}>
                                        <span className="flex items-center gap-1.5">
                                            <span className="relative flex size-[6px]">
                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF6B60] opacity-75" />
                                                <span className="relative inline-flex size-[6px] rounded-full bg-[#FF6B60]" />
                                            </span>
                                            <span className="text-[9px] font-bold uppercase tracking-[0.12em]">Elapsed</span>
                                        </span>
                                        <span className="font-mono text-[13px] font-semibold tracking-[-0.02em] tabular-nums ml-[22px]">{elapsed}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <IncidentTiles tiles={tiles} />
            </div>
        </section>
    );
};

export default IncidentCommandStrip;
