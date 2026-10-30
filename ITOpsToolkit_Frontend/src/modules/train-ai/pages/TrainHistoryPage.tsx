import { PlusCircle, ClipboardList, LayoutDashboard, BookOpen, Award, Zap, TrendingUp } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useQuizListQuery } from '../hooks/useQuizListQuery';
import QuizCard from '../components/ui/QuizCard/QuizCard';
import QuizHistoryTable from '../components/smart/QuizHistoryTable/QuizHistoryTable';

const cardStyles = [
    { background: 'linear-gradient(135deg, #1a2f6d 0%, #2d50b0 100%)' },
    { background: 'linear-gradient(135deg, #1e52c4 0%, #3b82f6 100%)' },
    { background: 'linear-gradient(135deg, #2563eb 0%, #4f8ef7 100%)' },
    { background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)' },
];

const TrainHistoryPage: React.FC = () => {
    const query = useQuizListQuery();

    const stats = query.data ?? { total: 0, passed: 0, passRate: 0, firstAttemptPass: 0, avgScore: 0, quizList: [] };

    return (
        <div id="train-history" className="grid w-full h-full gap-1 p-0 overflow-auto lg:overflow-hidden" style={{ gridTemplateRows: 'auto 1fr' }}>
            <div className="grid grid-cols-1 gap-2 mt-1 px-2">
                <h2 className="text-base font-bold text-(--brand-header-title-color)">My Stats</h2>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <QuizCard title="Quizzes Taken" value={stats.total} subtitle={`Out of ${stats.total} total`} icon={<BookOpen size={16} />} style={cardStyles[0]} />
                    <QuizCard title="Quizzes Passed" value={stats.passed} subtitle={`${stats.passRate}% pass rate`} icon={<Award size={16} />} style={cardStyles[1]} />
                    <QuizCard title="First Attempt Pass" value={stats.firstAttemptPass} subtitle={`Out of ${stats.passed} passed`} icon={<Zap size={16} />} style={cardStyles[2]} />
                    <QuizCard
                        title="Average Score"
                        value={stats.total > 0 ? `${stats.avgScore}%` : '0%'}
                        subtitle={stats.total > 0 ? `Based on ${stats.total} attempts` : 'No attempts yet'}
                        icon={<TrendingUp size={16} />}
                        style={cardStyles[3]}
                    />
                </div>

                {/* Search + Navigation */}
                <div className="flex flex-col items-center gap-2 py-1">
                    {/* <div className="relative w-full max-w-2xl">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={15}
                        />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                    </div> */}
                    <div className="flex gap-2">
                        <Link
                            to="/transition-ai/train-ai/new-quiz"
                            search={{ resume: undefined }}
                            className="btn-split split-blue flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
                        >
                            <span className="flex flex-row gap-2 justify-center items-center">
                                <PlusCircle size={13} />
                                New Quiz
                            </span>
                        </Link>
                        <Link
                            to="/transition-ai/train-ai/mock-quiz"
                            className="btn-split split-blue flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
                        >
                            <span className="flex flex-row gap-2 justify-center items-center">
                                <ClipboardList size={13} />
                                Mock Quiz
                            </span>
                        </Link>
                        <Link
                            to="/transition-ai/train-ai"
                            className="btn-split split-blue flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                        >
                            <span className="flex flex-row gap-2 justify-center items-center">
                                <LayoutDashboard size={13} />
                                Dashboard
                            </span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Quiz History Table */}
            <div className="px-1 pb-1 overflow-hidden">
                <QuizHistoryTable query={query} />
            </div>
        </div>
    );
};

export default TrainHistoryPage;
