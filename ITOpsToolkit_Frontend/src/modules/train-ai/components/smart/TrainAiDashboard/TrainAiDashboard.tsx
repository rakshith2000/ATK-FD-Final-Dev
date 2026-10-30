import { memo, useMemo } from 'react';
import { Award, BookOpen, HelpCircle, Info, Percent, TrendingUp, Users, Zap } from 'lucide-react';
import { ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { ArticleSkeleton, CardSkeleton, GridSkeleton } from '@/shared/components/ui/Skeletons';
import { useTrainAiDashboard } from '../../../hooks/useTrainAiDashboard';
import DashboardHero from '../../ui/DashboardHero/DashboardHero';
import StatsSection from '../../ui/StatsSection/StatsSection';
import type { StatCardProps } from '../../ui/StatCard/StatCard';
import DidYouKnowBanner from '../../ui/DidYouKnowBanner/DidYouKnowBanner';
import SectionPanel from '../../ui/SectionPanel/SectionPanel';
import TopicBarList from '../../ui/TopicBarList/TopicBarList';
import PassPercentageList from '../../ui/PassPercentageList/PassPercentageList';
import AwardsList from '../../ui/AwardsList/AwardsList';
import AchievementsSummary from '../../ui/AchievementsSummary/AchievementsSummary';
import RoomToGrowList from '../../ui/RoomToGrowList/RoomToGrowList';
import BadgeGrid from '../../ui/BadgeGrid/BadgeGrid';
import useResponsiveScreenSize from '@/shared/hooks/useResponsiveScreenSize';

const DID_YOU_KNOW = 'Learners who retake quizzes improve their score by an average of 20–30 points. A wrong answer today is just a right answer waiting to happen.';

const DashboardSkeleton: React.FC = () => {
    const { lte } = useResponsiveScreenSize();

    const vw = lte('md') ? 500 : 1200;

    return (
        <div className="flex flex-col gap-5">
            <ArticleSkeleton rows={2} VW={vw} />
            <GridSkeleton rows={1} cols={5} VW={vw} GAP={10} />
            <div className="grid grid-cols-3 gap-5">
                <CardSkeleton rows={1} VW={vw} />
                <CardSkeleton rows={1} VW={vw} />
                <CardSkeleton rows={1} VW={vw} />
            </div>

            <CardSkeleton rows={1} VW={lte('md') ? 500 : 1800} />
        </div>
    );
};

/**
 * Smart container for the Train AI dashboard. Owns data/loading/error state via
 * {@link useTrainAiDashboard} and composes the presentational UI components.
 */
const TrainAiDashboard: React.FC = memo(() => {
    const { quizzesQuery, userStatsQuery, stats } = useTrainAiDashboard();

    // "My Stats" is sourced from GET /list_all_quizzes_for_user (the signed-in
    // user's own quizzes), independent of the community-wide list.
    const myStats = useMemo<StatCardProps[]>(() => {
        const quizzesTaken = userStatsQuery.data?.total ?? 0;
        const quizzesPassed = userStatsQuery.data?.passed ?? 0;
        const passRate = userStatsQuery.data?.passRate ?? 0;
        const firstAttemptPass = userStatsQuery.data?.firstAttemptPass ?? 0;
        const averageScore = userStatsQuery.data?.avgScore ?? 0;

        return [
            { title: 'Quizzes Taken', value: quizzesTaken, subtitle: `Out of ${stats.community.totalQuizzes} total`, variant: 'navy', icon: <BookOpen size={22} /> },
            { title: 'Quizzes Passed', value: quizzesPassed, subtitle: `${passRate}% pass rate`, variant: 'blue', icon: <Award size={22} /> },
            { title: 'First Attempt Pass', value: firstAttemptPass, subtitle: `Out of ${quizzesPassed} passed`, variant: 'sky', icon: <Zap size={22} /> },
            {
                title: 'Average Score',
                value: `${averageScore}%`,
                subtitle: quizzesTaken > 0 ? 'Across your quizzes' : 'No attempts yet',
                variant: 'light',
                icon: <TrendingUp size={22} />,
            },
        ];
    }, [userStatsQuery.data, stats.community.totalQuizzes]);

    const communityStats = useMemo<StatCardProps[]>(
        () => [
            { title: 'Community Quizzes', value: stats.community.totalQuizzes, subtitle: `By ${stats.community.learners} learners`, variant: 'navy', icon: <Users size={22} /> },
            { title: 'Community Pass Rate', value: `${stats.community.passRate}%`, subtitle: 'Every attempt builds knowledge', variant: 'blue', icon: <Percent size={22} /> },
            {
                title: 'First Attempt Success',
                value: stats.community.firstAttemptSuccess,
                subtitle: `${stats.community.firstAttemptPercentage}% of passes`,
                variant: 'sky',
                icon: <Zap size={22} />,
            },
            { title: 'Total Questions', value: stats.community.totalQuestions, subtitle: 'Total Questions', variant: 'light', icon: <HelpCircle size={22} /> },
        ],
        [stats.community],
    );

    if (quizzesQuery.isLoading || userStatsQuery.isLoading) return <DashboardSkeleton />;
    if (quizzesQuery.isError) {
        return <ErrorPlaceholder iconSize={150} error={quizzesQuery.error} onRetry={quizzesQuery.refetch} isRefetching={quizzesQuery.isRefetching} />;
    }
    if (userStatsQuery.isError) {
        return <ErrorPlaceholder iconSize={150} error={userStatsQuery.error} onRetry={userStatsQuery.refetch} isRefetching={userStatsQuery.isRefetching} />;
    }

    return (
        <div className="flex flex-col gap-6">
            <DashboardHero rank={stats.user.rank} communityQuizzes={stats.community.totalQuizzes} knowledgeArticles={stats.community.knowledgeArticles} />

            <StatsSection title="My Stats" stats={myStats} />
            <StatsSection title="Community stats" stats={communityStats} />

            <DidYouKnowBanner message={DID_YOU_KNOW} />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <SectionPanel title="Top Topics by Participation">
                    <TopicBarList topics={stats.topTopics} />
                </SectionPanel>
                <SectionPanel title="Community Pass Percentage">
                    <PassPercentageList topics={stats.passByTopic} />
                </SectionPanel>
                <SectionPanel title="Top Community Awards">
                    <AwardsList awards={stats.communityAwards} />
                </SectionPanel>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <SectionPanel
                    title="Achievements"
                    action={
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 text-gray-500">
                            <Info size={14} /> How to earn badges
                        </span>
                    }
                >
                    <AchievementsSummary totalPoints={stats.totalPoints} nextReward={stats.nextReward} />
                </SectionPanel>
                <SectionPanel title="Topics with Most Room to Grow">
                    <RoomToGrowList topics={stats.roomToGrow} />
                </SectionPanel>
            </div>

            <SectionPanel title="Overall Progress" action={`${stats.unlockedCount} / ${stats.totalAchievements} unlocked`}>
                <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(stats.unlockedCount / stats.totalAchievements) * 100}%` }} />
                </div>
                <BadgeGrid achievements={stats.achievements} />
            </SectionPanel>
        </div>
    );
});

TrainAiDashboard.displayName = 'TrainAiDashboard';

export default TrainAiDashboard;
