import { memo } from 'react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import StatCard, { type StatCardProps } from '../StatCard/StatCard';

export interface StatsSectionProps {
    title: string;
    stats: Array<StatCardProps & { key?: string }>;
    className?: ClassNameValue;
}

/** A titled responsive grid of {@link StatCard} tiles. */
const StatsSection: React.FC<StatsSectionProps> = memo(({ title, stats, className }) => {
    return (
        <section className={twMerge('rounded-2xl border border-gray-200 bg-white p-5 shadow-sm', className)}>
            <h2 className="mb-4 text-xl font-bold text-(--brand-title-primary-color)">{title}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat, index) => (
                    <StatCard key={stat.key ?? `${stat.title}-${index}`} {...stat} />
                ))}
            </div>
        </section>
    );
});

StatsSection.displayName = 'StatsSection';

export default StatsSection;
