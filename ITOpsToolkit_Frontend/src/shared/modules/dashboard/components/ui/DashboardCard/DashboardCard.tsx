import type { ReactNode } from 'react';

export function DashboardCard({ children, className }: { children: ReactNode; className?: string }) {
    return <section className={`db-card${className ? ` ${className}` : ''}`}>{children}</section>;
}

export function DashboardCardHead({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
    return (
        <header className="db-card-head">
            <div>
                <div className="db-card-title text-sm">{title}</div>
                {subtitle && <div className="db-card-subtitle text-[0.72rem]">{subtitle}</div>}
            </div>
            {right}
        </header>
    );
}
