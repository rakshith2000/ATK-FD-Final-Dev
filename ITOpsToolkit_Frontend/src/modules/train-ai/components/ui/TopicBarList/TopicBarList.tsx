import { memo } from 'react';
import type { TopicParticipation } from '../../../types/train-ai';

export interface TopicBarListProps {
    topics: TopicParticipation[];
    emptyMessage?: string;
}

/** Horizontal participation bars, one per topic, scaled to the busiest topic. */
const TopicBarList: React.FC<TopicBarListProps> = memo(({ topics, emptyMessage = 'No topics attempted yet.' }) => {
    if (topics.length === 0) {
        return <p className="py-8 text-center text-sm text-gray-400">{emptyMessage}</p>;
    }

    const max = Math.max(...topics.map((t) => t.count), 1);

    return (
        <ul className="flex flex-col gap-4">
            {topics.map((topic) => (
                <li key={topic.topic} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm font-medium text-(--brand-title-primary-color)" title={topic.topic}>
                        {topic.topic}
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-blue-800 transition-all" style={{ width: `${(topic.count / max) * 100}%` }} />
                    </div>
                    <span className="w-6 shrink-0 text-right text-sm font-semibold text-gray-600">{topic.count}</span>
                </li>
            ))}
        </ul>
    );
});

TopicBarList.displayName = 'TopicBarList';

export default TopicBarList;
