import { memo } from 'react';
import { Bot, Trophy } from 'lucide-react';
import StatCard from '../StatCard/StatCard';

export interface AchievementsSummaryProps {
    totalPoints: number;
    nextReward: number | null;
}

/** The two summary tiles above the achievements grid: points earned + next goal. */
const AchievementsSummary: React.FC<AchievementsSummaryProps> = memo(({ totalPoints, nextReward }) => {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard variant="mint" title="Total Points" value={totalPoints} icon={<Bot size={32} />} />
            <StatCard variant="lavender" title="Next Reward" value={nextReward ?? 'All done'} icon={<Trophy size={32} />} />
        </div>
    );
});

AchievementsSummary.displayName = 'AchievementsSummary';

export default AchievementsSummary;
