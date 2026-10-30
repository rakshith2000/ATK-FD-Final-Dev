import { memo } from 'react';
import type { CommunityAward } from '../../../types/train-ai';

export interface AwardsListProps {
    awards: CommunityAward[];
    emptyMessage?: string;
}

const TONES = ['bg-blue-900 text-white', 'bg-blue-600 text-white', 'bg-blue-400 text-white'];

/** Ranked "Top Community Awards" cards with an earned-count badge. */
const AwardsList: React.FC<AwardsListProps> = memo(({ awards, emptyMessage = 'No awards earned yet.' }) => {
    if (awards.length === 0) {
        return <p className="py-8 text-center text-sm text-gray-400">{emptyMessage}</p>;
    }

    return (
        <ul className="flex flex-col gap-3">
            {awards.map((award, index) => {
                const Icon = award.icon;
                return (
                    <li key={award.id} className={`flex items-center justify-between rounded-xl px-4 py-3.5 ${TONES[index] ?? TONES[TONES.length - 1]}`}>
                        <div className="flex items-center gap-3">
                            <span className="flex size-9 items-center justify-center rounded-full bg-white/20">
                                <Icon size={18} />
                            </span>
                            <span className="text-sm font-semibold">{award.label}</span>
                        </div>
                        <span className="text-lg font-bold">{award.earnedCount} earned</span>
                    </li>
                );
            })}
        </ul>
    );
});

AwardsList.displayName = 'AwardsList';

export default AwardsList;
