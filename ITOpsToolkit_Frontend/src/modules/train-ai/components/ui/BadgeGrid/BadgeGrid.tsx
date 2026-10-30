import { memo } from 'react';
import { Lock } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import type { ResolvedAchievement } from '../../../types/train-ai';

export interface BadgeGridProps {
    achievements: ResolvedAchievement[];
}

/** Grid of every achievement, showing unlocked badges and locked targets. */
const BadgeGrid: React.FC<BadgeGridProps> = memo(({ achievements }) => {
    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {achievements.map((achievement) => {
                const Icon = achievement.icon;
                return (
                    <div
                        key={achievement.id}
                        title={`${achievement.current}/${achievement.target} · ${achievement.points} pts`}
                        className={twMerge(
                            'flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors',
                            achievement.unlocked ? 'border-blue-200 bg-blue-50/70' : 'border-gray-200 bg-gray-50',
                        )}
                    >
                        <span className={twMerge('flex size-11 items-center justify-center rounded-full', achievement.unlocked ? 'bg-white shadow-sm' : 'bg-gray-100')}>
                            {achievement.unlocked ? <Icon size={20} className="text-(--brand-title-primary-color)" /> : <Lock size={18} className="text-gray-400" />}
                        </span>
                        <span className={twMerge('text-sm font-semibold', achievement.unlocked ? 'text-(--brand-title-primary-color)' : 'text-gray-400')}>{achievement.label}</span>
                        <span className="text-xs text-gray-400">{achievement.description}</span>
                        {!achievement.unlocked && achievement.target > 1 ? (
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                                <div className="h-full rounded-full bg-blue-400" style={{ width: `${(achievement.current / achievement.target) * 100}%` }} />
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
});

BadgeGrid.displayName = 'BadgeGrid';

export default BadgeGrid;
