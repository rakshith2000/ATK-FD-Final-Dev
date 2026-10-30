import { memo } from 'react';
import type { RoomToGrowTopic } from '../../../types/train-ai';

export interface RoomToGrowListProps {
    topics: RoomToGrowTopic[];
    emptyMessage?: string;
}

/** Topics with the lowest pass rates, surfaced as improvement opportunities. */
const RoomToGrowList: React.FC<RoomToGrowListProps> = memo(({ topics, emptyMessage = 'Every topic is fully mastered — great work!' }) => {
    if (topics.length === 0) {
        return <p className="py-8 text-center text-sm text-gray-400">{emptyMessage}</p>;
    }

    return (
        <ul className="flex flex-col divide-y divide-gray-100">
            {topics.map((topic) => (
                <li key={topic.topic} className="flex items-center justify-between gap-3 py-3">
                    <span className="truncate text-base font-semibold text-(--brand-title-primary-color)" title={topic.topic}>
                        {topic.topic}
                    </span>
                    <span className="shrink-0 text-sm font-medium text-blue-500">{topic.hint}</span>
                </li>
            ))}
        </ul>
    );
});

RoomToGrowList.displayName = 'RoomToGrowList';

export default RoomToGrowList;
