import type React from 'react';
import { Link } from '@tanstack/react-router';
import { ExternalLink, Play, RefreshCw, Settings2 } from 'lucide-react';

export interface MimTopBarProps {
    incidentNumber: string;
    /** Elapsed clock string "HH:MM:SS" derived from opened_at. */
    elapsed: string;
    serviceNowLink: string;
    isRefreshing: boolean;
    onRefresh: () => void;
}

const tbBtn =
    'inline-flex items-center gap-1.5 rounded-[5px] border border-white/20 bg-white/[0.09] px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/[0.17]';

/**
 * Branded command bar reproducing the `.topbar` region of the shared HTML mockup
 * (deep navy #001E4C with a #0033A0 accent border).
 *
 * The scenario picker, "Play alerts" and "Configure" are DUMMY, visual-only preview
 * controls (per spec). The elapsed clock is real (derived from opened_at). Refresh +
 * "View in ServiceNow" are live actions styled to match the mockup's `.tb-btn`.
 */
const MimTopBar: React.FC<MimTopBarProps> = ({ incidentNumber, elapsed, serviceNowLink, isRefreshing, onRefresh }) => {
    return (
        <header className="bg-[#001E4C] border-b-[3px] border-[#0033A0] text-white">
            <div className="flex items-center gap-x-6 gap-y-3 flex-wrap px-6 py-3.5">
                {/* Brand lock-up */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <svg width="30" height="34" viewBox="0 0 30 34" aria-label="Cognizant" role="img">
                        <path d="M15 1.2 28.4 8.9v15.4L15 32 1.6 24.3V8.9z" fill="#0033A0" />
                        <path d="M15 1.2 28.4 8.9 15 16.6 1.6 8.9z" fill="#3D7BE0" />
                        <path d="M15 16.6 28.4 8.9v15.4L15 32z" fill="#00205B" />
                        <path d="M15 16.6 1.6 8.9v15.4L15 32z" fill="#0033A0" />
                    </svg>
                    <span className="text-[21px] font-semibold lowercase tracking-[-0.02em] text-white">cognizant</span>
                </div>

                <div className="hidden sm:block w-px h-[34px] bg-white/25" aria-hidden />

                <div className="min-w-0">
                    <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-white leading-tight">Major Incident Manager Accelerator</h1>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-white/[0.62] mt-0.5">Agentic incident command &amp; process assurance</p>
                </div>

                <div className="ml-auto flex items-center gap-3 flex-wrap">
                    {/* Dummy, visual-only scenario picker */}
                    <div
                        className="hidden md:flex items-center gap-2 rounded-[5px] border border-white/[0.18] bg-white/[0.09] pl-[11px] pr-2 py-[5px]"
                        title="Preview control"
                        aria-hidden
                    >
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">Incident</span>
                        <span className="text-[13px] font-medium text-white">{incidentNumber}</span>
                    </div>

                    {/* Dummy, visual-only preview buttons */}
                    <span className={`${tbBtn} hidden lg:inline-flex select-none pointer-events-none`} title="Preview control" aria-hidden>
                        <Play size={12} fill="currentColor" />
                        Play alerts
                    </span>
                    <span className={`${tbBtn} hidden lg:inline-flex select-none pointer-events-none`} title="Preview control" aria-hidden>
                        <Settings2 size={13} />
                        Configure
                    </span>

                    {/* Live actions */}
                    <button type="button" onClick={onRefresh} className={tbBtn} disabled={isRefreshing}>
                        <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <Link to={serviceNowLink} target="_blank" className={tbBtn}>
                        <ExternalLink size={13} />
                        View in ServiceNow
                    </Link>

                    {/* Live elapsed clock */}
                    <div className="flex items-center gap-2.5 rounded-[5px] border border-[#FF968E]/45 bg-[#C0271F]/[0.16] px-3 py-1.5">
                        <span className="relative flex size-[7px]">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF6B60] opacity-75" />
                            <span className="relative inline-flex size-[7px] rounded-full bg-[#FF6B60]" />
                        </span>
                        <span className="flex flex-col leading-none gap-0.5">
                            <span className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-white/70">Elapsed</span>
                            <span className="font-mono text-[15px] font-semibold tracking-[-0.02em] tabular-nums text-white">{elapsed}</span>
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default MimTopBar;
