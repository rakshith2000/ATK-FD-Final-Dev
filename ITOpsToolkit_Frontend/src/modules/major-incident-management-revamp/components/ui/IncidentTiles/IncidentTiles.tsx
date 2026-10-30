import type React from 'react';
import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type TileTone = 'default' | 'ok' | 'warn' | 'alarm';

export interface IncidentTile {
    /** Uppercase label (key). */
    k: string;
    /** Primary value. */
    v: ReactNode;
    /** Optional sub-line. */
    sub?: ReactNode;
    tone?: TileTone;
    mono?: boolean;
}

const toneClass: Record<TileTone, string> = {
    default: 'text-[#12182B]',
    ok: 'text-[#0E7C4A]',
    warn: 'text-[#B26B00]',
    alarm: 'text-[#C0271F]',
};

/**
 * Command-strip tile grid — mirrors the HTML mockup `.tiles`/`.tile`: a 6-column grid
 * with 1px hairline separators (rule-coloured background showing through the gap).
 * Collapses to 3 / 2 columns on narrower widths.
 */
const IncidentTiles: React.FC<{ tiles: IncidentTile[] }> = ({ tiles }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-px rounded-[6px] overflow-hidden bg-[#DCE3EE] border border-[#DCE3EE]">
            {tiles.map((t, i) => (
                <div key={`${t.k}-${i}`} className="bg-white px-3.5 py-3 min-w-0">
                    <div className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#78839A] truncate whitespace-nowrap">{t.k}</div>
                    <div className={twMerge('mt-[5px] text-[17px] font-semibold tracking-[-0.02em] leading-[1.2] truncate', toneClass[t.tone ?? 'default'], t.mono && 'font-mono')}>
                        {t.v}
                    </div>
                    {t.sub ? <div className="mt-0.5 text-[11px] text-[#78839A] truncate">{t.sub}</div> : null}
                </div>
            ))}
        </div>
    );
};

export default IncidentTiles;
