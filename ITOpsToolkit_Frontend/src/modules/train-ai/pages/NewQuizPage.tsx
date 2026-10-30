import { useState } from 'react';
import { Search } from 'lucide-react';
import { useLocation } from '@tanstack/react-router';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import TextInput from '@/shared/components/ui/InputFields/TextInput';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import logger from '@/shared/utils/logger';
import NewQuizSelector from '../components/smart/NewQuizSelector/NewQuizSelector';
import QuizPlayer from '../components/ui/QuizPlayer/QuizPlayer';
import { useGetMcqsMutation } from '../hooks/useGetMcqsMutation';
import type { GetMcqsResponse } from '../types/train-ai';

type PageMode = 'selector' | 'quiz';

interface QuizSession {
    quizId: string;
    category: string;
    data: GetMcqsResponse;
}

const NewQuizPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const location = useLocation();
    const locationState = location.state as { quizSession?: QuizSession } | null;

    const [pageMode, setPageMode] = useState<PageMode>(locationState?.quizSession ? 'quiz' : 'selector');
    const [quizSession, setQuizSession] = useState<QuizSession | null>(locationState?.quizSession ?? null);

    const { state } = useAuth();
    const getMcqsMutation = useGetMcqsMutation();

    logger.debug('[NewQuizPage] user id:', state.user?.id);
    logger.debug('[NewQuizPage] user details:', state.user);

    const handleStartQuiz = (quizId: string, category: string) => {
        getMcqsMutation.mutate(
            { user_id: state.user?.uniqueId ?? '', quiz_code: quizId, type_of_submit: 'start' },
            {
                onSuccess: (data) => {
                    if (data) {
                        setQuizSession({ quizId, category, data });
                        setPageMode('quiz');
                    }
                },
            },
        );
    };

    const handleExitQuiz = () => {
        setQuizSession(null);
        setPageMode('selector');
    };

    if (getMcqsMutation.isPending) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <ComponentLoadingIndicator />
            </div>
        );
    }

    if (pageMode === 'quiz' && quizSession) {
        return (
            <QuizPlayer
                quizId={quizSession.quizId}
                userId={state.user?.uniqueId ?? ''}
                category={quizSession.category}
                startTime={quizSession.data.start_time}
                endTime={quizSession.data.end_time}
                questions={quizSession.data.questions}
                onExit={handleExitQuiz}
            />
        );
    }

    return (
        <div id="new-quiz" className="grid w-full h-full gap-1 p-0 overflow-auto lg:overflow-hidden" style={{ gridTemplateRows: 'auto 1fr' }}>
            {/* Top bar */}
            <div className="flex items-center justify-between mt-0.5 px-2">
                <div>
                    <TitleWithArraow title="New Quiz" className="text-sm font-extrabold uppercase text-(--brand-header-title-color)" />
                    <p className="text-xs text-(--brand-header-title-color) opacity-60 px-2">Create customized quiz &amp; get evaluated – Choose your path</p>
                </div>
                <div className="relative w-64 mr-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={14} />
                    <TextInput placeholder="Search Articles..." value={searchTerm} onChange={setSearchTerm} className="pl-8 pr-3 py-1.5 bg-gray-50" />
                </div>
            </div>

            {/* Main content */}
            <ShellLayout className="mx-1 mb-1 shadow-xs rounded border border-gray-200 gap-0">
                <ShellLayout.Body className="overflow-hidden p-0">
                    <NewQuizSelector searchTerm={searchTerm} onStartQuiz={handleStartQuiz} />
                </ShellLayout.Body>
            </ShellLayout>
        </div>
    );
};

export default NewQuizPage;
