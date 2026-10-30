import { memo } from 'react';
import { twMerge } from 'tailwind-merge';
import type { KnowledgeArticle } from '@/shared/modules/servicenow/types/knowledge';
import getServiceNowLink from '@/shared/modules/servicenow/utils/get-service-now-link';

interface RecentKBArticleCardProps {
    kb: KnowledgeArticle;
    isSelected?: boolean;
}

const RecentKBArticleCard: React.FC<RecentKBArticleCardProps> = memo(
    ({ kb, isSelected = false }) => {
        return (
            <div
                role="button"
                onClick={() => window.open(getServiceNowLink({ sysId: kb.sys_id?.value ?? 'kb_sys_id_not_found', type: 'kb_knowledge' }), '_blank')}
                data-kb-number={kb.number}
                className={twMerge(
                    'w-full cursor-pointer border-b border-gray-200 bg-transparent px-3 py-2.5 transition-all duration-200',
                    'brand-border-left-only-hover brand-box-show-inset-only-hover',
                    isSelected && 'brand-border-left brand-box-show-inset',
                )}
            >
                {/* Row 1 - Number (left) + Category (right) */}
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-(--brand-header-title-color) truncate">{kb.number?.display_value}</span>
                    <span className="shrink-0 rounded-full bg-(--brand-title-primary-color)/10 px-2 py-0.5 text-[0.6rem] font-medium text-(--brand-title-primary-color)">
                        {kb.kb_category?.display_value}
                    </span>
                </div>

                {/* Row 2 - Short Description (full width) */}
                <div className="flex items-start justify-start gap-0.5 mt-1.5">
                    <p>
                        <span className="text-[0.7rem] font-semibold text-(--brand-header-title-color)">Short Description : </span>
                        <span className="text-[0.7rem] text-(--brand-title-primary-color)">{kb.short_description?.display_value}</span>
                    </p>
                </div>
            </div>
        );
    },
    (prev, next) =>
        prev.isSelected === next.isSelected &&
        prev.kb.number === next.kb.number &&
        prev.kb.short_description === next.kb.short_description &&
        prev.kb.kb_category === next.kb.kb_category,
);

RecentKBArticleCard.displayName = 'RecentKBCard';
export default RecentKBArticleCard;
