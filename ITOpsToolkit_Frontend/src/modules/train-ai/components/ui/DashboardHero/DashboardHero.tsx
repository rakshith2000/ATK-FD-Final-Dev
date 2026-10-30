import { memo } from 'react';
import { Link } from '@tanstack/react-router';
import { BookOpen, ClipboardList, History, Medal, PenSquare } from 'lucide-react';

export interface DashboardHeroProps {
    rank: number;
    communityQuizzes: number;
    knowledgeArticles: number;
}

const ACTIONS = [
    { to: '/transition-ai/train-ai/new-quiz', label: 'New Quiz', icon: PenSquare },
    { to: '/transition-ai/train-ai/mock-quiz', label: 'Mock Quiz', icon: ClipboardList },
    { to: '/transition-ai/knowledge-browser', label: 'Knowledge Browser', icon: BookOpen },
    { to: '/transition-ai/train-ai/train-history', label: 'Train History', icon: History },
] as const;

/** Top banner: welcome message, rank chip, quick actions and community summary. */
const DashboardHero: React.FC<DashboardHeroProps> = memo(({ rank, communityQuizzes, knowledgeArticles }) => {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold text-(--brand-title-primary-color)">Welcome back! Keep growing</h1>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm">
                        <Medal size={16} /> Your Rank #{rank}
                    </span>
                </div>

                <div className="flex flex-wrap gap-2.5">
                    {ACTIONS.map(({ to, label, icon: Icon }) => (
                        <Link
                            key={to}
                            to={to}
                            viewTransition
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                        >
                            <Icon size={16} />
                            {label}
                        </Link>
                    ))}
                </div>
            </div>

            <p className="text-sm text-gray-500">
                Every quiz you take is a step forward. The community has collectively answered <strong className="text-gray-700">{communityQuizzes}</strong> quizzes across{' '}
                <strong className="text-gray-700">{knowledgeArticles}</strong> knowledge {knowledgeArticles === 1 ? 'article' : 'articles'} — and the learning never stops.
            </p>
        </div>
    );
});

DashboardHero.displayName = 'DashboardHero';

export default DashboardHero;
