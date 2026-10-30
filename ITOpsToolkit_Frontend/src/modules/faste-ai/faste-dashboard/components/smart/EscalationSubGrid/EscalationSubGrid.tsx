import React from 'react';
import { ESCALATION_METRICS_SCHEMA } from '../../../services/types';

interface EscalationSubGridProps {
    breakdown?: Record<string, number>;
    onItemClick: (type: string) => void;
}

export const EscalationSubGrid: React.FC<EscalationSubGridProps> = ({ breakdown = {}, onItemClick }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {ESCALATION_METRICS_SCHEMA.map((item, idx) => {
                const count = breakdown[item.key] || breakdown[item.display] || 0;
                return (
                    <div
                        key={idx}
                        onClick={() => onItemClick(item.key)}
                        className="bg-white font-bold border border-[#BBDDFF] rounded-xl p-4 flex flex-row items-center justify-start gap-3 cursor-pointer transition-all duration-200 select-none min-h-15 hover:bg-[#D9ECFF]"
                    >
                        <span className="text-2xl font-bold text-[#011A80] leading-none shrink-0">{count}</span>
                        <span className="text-xs font-bold text-[#334155] leading-tight tracking-tight whitespace-normal">{item.display}</span>
                    </div>
                );
            })}
        </div>
    );
};
