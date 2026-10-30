import React from 'react';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import { ESCALATION_METRICS_SCHEMA } from '../../../services/types';

interface CategoryReportItem {
    title: string;
    measures: string[];
    stats: {
        raised: number;
        resolved: number;
        escalated: number;
        breakdown: Record<string, number>;
    };
}

export const DetailedCategoryReport: React.FC<{
    categoryAnalysis: CategoryReportItem[];
    onCategoryCardClick: (category: CategoryReportItem) => void;
    handleKPIClick: (action: string, type: string, categoryContext?: string) => void;
}> = ({ categoryAnalysis, onCategoryCardClick, handleKPIClick }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {categoryAnalysis.map((category, idx) => (
                <div
                    key={idx}
                    className="bg-white border-2 border-[#D9ECFF] rounded-[16px] p-3.5 shadow-[inset_0_0_16px_0_rgba(164,209,255,0.4)] hover:-translate-y-0.5 transition-transform duration-200 flex flex-col justify-between h-full cursor-pointer"
                    onClick={() => onCategoryCardClick(category)}
                >
                    <div>
                        <div className="flex justify-between items-end mb-2.5">
                            <TitleWithArraow
                                title={category.title}
                                showArrow={true}
                                className="p-0 text-base font-extrabold pb-0.5 tracking-tight text-(--brand-title-primary-color) [--ticket-title-color:var(--brand-title-primary-color)] [--change-arrow-color-itsm:var(--brand-title-primary-color)]"
                            />
                            <span className="text-[#3B62CC] text-[0.65rem] font-bold no-underline pb-0.5 hover:underline">View Report</span>
                        </div>

                        <div className="text-(--brand-title-primary-color) font-bold text-[0.75rem] my-1.5">Key Resolution Measures Observed</div>
                        <ul className="list-none p-0 m-0 border-l border-[#BBDDFF] ml-1 mb-2.5 space-y-1">
                            {category.measures.map((m, i) => (
                                <li
                                    key={i}
                                    className="text-[0.6rem] text-gray-500 pl-3 relative mb-1 leading-[1.15] before:content-[''] before:absolute before:left-0 before:top-1.5 before:w-2 before:h-px before:bg-[#BBDDFF]"
                                >
                                    {m}
                                </li>
                            ))}
                        </ul>

                        <div className="text-(--brand-title-primary-color) font-bold text-[0.75rem] my-1.5">Analysis: Ticket Raised By Categories</div>
                    </div>

                    <div className="rounded-lg py-1 mt-2">
                        <div className="bg-[#BBDDFF] py-1 pr-4 pl-3 rounded-r-[16px] text-[0.75rem] font-extrabold text-(--brand-title-primary-color) mb-2.5 -ml-3.5 inline-block min-w-[70%] shadow-xs">
                            {category.title} Total - {category.stats.raised}
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[0.6rem] font-bold text-gray-700 px-0.5">
                            <span className="text-gray-800 truncate">A. Resolved - {category.stats.resolved}</span>
                            <span className="text-gray-800 truncate">B. Escalated - {category.stats.escalated}</span>

                            {ESCALATION_METRICS_SCHEMA.map((item) => {
                                const metricCount = category.stats.breakdown[item.key] || category.stats.breakdown[item.display] || 0;
                                return (
                                    <span
                                        key={item.key}
                                        className="cursor-pointer text-gray-600 hover:text-blue-600 hover:underline truncate"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleKPIClick('escalation_type', item.key, category.title);
                                        }}
                                    >
                                        {item.display} - {metricCount}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
