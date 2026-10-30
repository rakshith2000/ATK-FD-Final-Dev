import React from 'react';

export interface AlertBannerItem {
    id: string;
    tag?: string;
    label: string;
}

export interface DashboardAlertBannerProps {
    title: string;
    count: number;
    subtitle?: string;
    activeBadgeText?: string;
    clearBadgeText?: string;
    icon?: React.ReactNode;
    items?: AlertBannerItem[];
    emptyText?: string;
}

function DefaultAlertIcon() {
    return (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

export function DashboardAlertBanner({
    title,
    count,
    subtitle = 'requiring immediate attention',
    activeBadgeText = 'Active',
    clearBadgeText = 'All clear',
    icon,
    items = [],
    emptyText = 'No urgent tickets active.',
}: DashboardAlertBannerProps) {
    const isActive = count > 0;

    return (
        <div className={`db-alert-banner${isActive ? ' db-alert-active' : ''}`}>
            <div className="db-alert-header">
                <span className="db-alert-title text-xs">
                    {icon ?? <DefaultAlertIcon />}
                    {title}
                </span>
                <span className={`db-alert-badge text-[0.7rem] ${isActive ? 'db-alert-badge--active' : 'db-alert-badge--clear'}`}>
                    {isActive ? activeBadgeText : clearBadgeText}
                </span>
            </div>

            <div className="db-alert-count text-[2.125rem]">{count}</div>
            <div className="db-alert-desc text-xs">{subtitle}</div>

            <div className="db-alert-items">
                {items.slice(0, 3).map((item) => (
                    <div key={item.id} className="db-alert-item text-[0.625rem]">
                        {item.tag && <span className="db-alert-type-tag text-[0.525rem]">{item.tag}</span>}
                        <span className="db-alert-item-text" title={item.label}>
                            {item.label}
                        </span>
                    </div>
                ))}
                {!isActive && <span className="db-alert-empty text-[0.72rem]">{emptyText}</span>}
            </div>
        </div>
    );
}
