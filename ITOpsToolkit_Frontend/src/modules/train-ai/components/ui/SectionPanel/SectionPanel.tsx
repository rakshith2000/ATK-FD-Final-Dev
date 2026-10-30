import { memo, type ReactNode } from 'react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';

export interface SectionPanelProps {
    title: string;
    /** Optional slot rendered on the right of the header (e.g. a hint/badge). */
    action?: ReactNode;
    children: ReactNode;
    className?: ClassNameValue;
    bodyClassName?: ClassNameValue;
}

/** Reusable white rounded card with a heading and optional header action. */
const SectionPanel: React.FC<SectionPanelProps> = memo(({ title, action, children, className, bodyClassName }) => {
    return (
        <section className={twMerge('flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm', className)}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-(--brand-title-primary-color)">{title}</h2>
                {action ? <div className="shrink-0 text-sm font-medium text-gray-400">{action}</div> : null}
            </div>
            <div className={twMerge('flex-1', bodyClassName)}>{children}</div>
        </section>
    );
});

SectionPanel.displayName = 'SectionPanel';

export default SectionPanel;
