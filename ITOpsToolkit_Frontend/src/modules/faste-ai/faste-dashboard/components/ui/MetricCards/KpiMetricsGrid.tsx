import React from 'react';

export interface KpiItem {
    key: string;
    label: string;
    value: number;
}

export interface KpiMetricsGridProps {
    items: KpiItem[];
    activeKey?: string;
    onItemClick: (key: string) => void;
    containerClassName?: string;
}

export const KpiMetricsGrid: React.FC<KpiMetricsGridProps> = ({
    items,
    activeKey,
    onItemClick,
    containerClassName = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4',
}) => {
    return (
        <div className={containerClassName}>
            {items.map((item) => {
                const isActive = activeKey === item.key;

                return (
                    <div
                        key={item.key}
                        onClick={() => onItemClick(item.key)}
                        className={`box-border cursor-pointer transition-all duration-300 ease-in-out select-none flex flex-col justify-center gap-1.5 px-3 py-2.5 min-h-17 ${
                            isActive
                                ? 'bg-[#D9ECFF] border border-[#3B62CC] ring-[#3B62CC] rounded-[12px]'
                                : 'bg-white border border-[#BBDDFF] rounded-[12px] shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:bg-[#E3F2FD]'
                        }`}
                    >
                        <span className="text-sm font-semibold text-[#3B62CC] tracking-normal leading-tight">{item.label}</span>
                        <h2 className="text-2xl sm:text-3xl font-bold text-[#011A80] m-0 leading-none">{item.value ?? 0}</h2>
                    </div>
                );
            })}
        </div>
    );
};

export default KpiMetricsGrid;
