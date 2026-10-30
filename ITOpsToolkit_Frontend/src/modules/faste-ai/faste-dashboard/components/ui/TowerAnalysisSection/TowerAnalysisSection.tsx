import React from 'react';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';

interface TowerData {
    name: string;
    raised: number;
    resolved: number;
    escalated: number;
}

export const TowerAnalysisSection: React.FC<{
    towerData: TowerData[];
    onTowerClick: (towerName: string) => void;
}> = ({ towerData, onTowerClick }) => {
    const towerOrdering = ['Windows', 'Linux', 'Network', 'Database', 'Cloud', 'Others'];

    return (
        <div className="mt-2 mb-3">
            {/* Header Bar */}
            <div className="flex flex-col md:flex-row md:items-center mb-3 relative gap-2">
                <div className="shrink-0">
                    <TitleWithArraow
                        title="Tower-wise Ticket Analysis"
                        showArrow={true}
                        className="p-0 text-lg font-extrabold pb-0.5 tracking-wide text-(--brand-title-primary-color) [--ticket-title-color:var(--brand-title-primary-color)] [--change-arrow-color-itsm:var(--brand-title-primary-color)]"
                    />
                </div>

                <div className="grow flex justify-center">
                    <div className="flex gap-3 px-3 py-1 border border-dashed border-blue-200 rounded-full bg-white shadow-xs text-xs font-bold">
                        <div className="flex items-center gap-1.5 text-gray-800">
                            <div className="w-2 h-2 rounded-full bg-[#35CCD1]" /> Raised
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-800">
                            <div className="w-2 h-2 rounded-full bg-[#2A9619]" /> Resolved
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-800">
                            <div className="w-2 h-2 rounded-full bg-[#444444]" /> Escalated
                        </div>
                    </div>
                </div>
                <div className="hidden md:block md:w-37.5" />
            </div>

            {/* Main Content Layout */}
            <div className="flex flex-col lg:flex-row items-stretch justify-between gap-4">
                {/* Left Side: Interactive Tower Cards */}
                <div className="flex flex-wrap gap-2.5 items-start justify-start shrink-0">
                    {towerData.map((tower, idx) => (
                        <div key={idx} className="flex flex-col w-30 cursor-pointer group select-none" onClick={() => onTowerClick(tower.name)}>
                            <div className="w-full h-25 bg-[#D1E9FF] rounded-[14px] border-2 border-[#A4D1FF] flex flex-col items-center pt-2 relative overflow-hidden shadow-xs transition-transform duration-200 group-hover:-translate-y-0.5">
                                <span className="text-(--brand-title-primary-color) text-xs font-bold tracking-wide z-10 relative truncate px-1.5 max-w-full">{tower.name}</span>

                                <div className="w-full h-15 absolute bottom-0 left-0 z-0 [box-shadow:0px_0px_8px_0px_#BBDDFF_inset]">
                                    <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="none">
                                        <polygon points="50,5 100,75 0,75" fill="white" stroke="#A4D1FF" strokeWidth="2" />
                                    </svg>
                                </div>

                                <span className="text-2xl font-black text-(--brand-title-primary-color) absolute bottom-2.5 left-0 w-full text-center z-10 leading-none">
                                    {tower.raised}
                                </span>
                            </div>

                            <div className="flex justify-between w-full px-1 pt-1 text-[11px] font-bold leading-tight">
                                <span className="text-[#2A9619]">Res: {tower.resolved}</span>
                                <span className="text-[#444444]">Esc: {tower.escalated}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Side: Summary Grid */}
                <div className="w-full lg:flex-1 [box-shadow:0px_0px_16px_0px_#A4D1FF_inset] border border-[#D9ECFF] rounded-[16px] bg-white grid grid-cols-3 auto-rows-fr overflow-hidden">
                    {towerOrdering.map((name, idx) => {
                        const tower = towerData.find((t) => t.name.toLowerCase() === name.toLowerCase());

                        const isNotRightColumn = (idx + 1) % 3 !== 0;
                        const isTopRow = idx < 3;

                        return (
                            <div
                                key={name}
                                className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50/50 transition-colors select-none min-w-0
                  ${isNotRightColumn ? 'border-r border-[#D9ECFF]' : ''} 
                  ${isTopRow ? 'border-b border-[#D9ECFF]' : ''}
                `}
                                onClick={() => onTowerClick(tower ? tower.name : name)}
                            >
                                <span className="text-xl lg:text-2xl font-black text-(--brand-title-primary-color) shrink-0 leading-none">{tower ? tower.raised : 0}</span>
                                <span className="text-xs text-gray-600 font-bold truncate">{name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
