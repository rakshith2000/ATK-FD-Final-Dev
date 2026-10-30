import { memo } from 'react';
import type { TopicPassStat } from '../../../types/train-ai';

export interface PassPercentageListProps {
    topics: TopicPassStat[];
    emptyMessage?: string;
}

/** Per-topic average-score pills (green/amber/red by score band). */
const PassPercentageList: React.FC<PassPercentageListProps> = memo(({ topics, emptyMessage = 'No scores recorded yet.' }) => {
    if (topics.length === 0) {
        return <p className="py-8 text-center text-sm text-gray-400">{emptyMessage}</p>;
    }

    const band = (score: number) => (score >= 70 ? 'bg-teal-50 text-teal-700' : score >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700');

    return (
        <ul className="flex flex-col gap-3">
            {topics.map((topic) => (
                <li key={topic.topic} className={`flex items-center justify-between rounded-lg px-4 py-3 ${band(topic.averageScore)}`}>
                    <span className="truncate text-sm font-semibold uppercase" title={topic.topic}>
                        {topic.topic}
                    </span>
                    <span className="shrink-0 text-sm font-medium opacity-80">{topic.averageScore} AVG</span>
                </li>
            ))}
        </ul>
    );
});

PassPercentageList.displayName = 'PassPercentageList';

export default PassPercentageList;
