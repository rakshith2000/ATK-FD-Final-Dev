import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { LoadingPlaceholder } from '@/shared/components/ui/Placeholders';
import { useSubmitQuizMutation } from '../../../hooks/useSubmitQuizMutation';
import { useListIncorrectResponsesMutation } from '../../../hooks/useListIncorrectResponsesMutation';
import Modal from '@/shared/components/ui/Modal/Modal';
import QuizSavedModal from '../QuizSavedModal/QuizSavedModal';
import QuizCompletedModal from '../QuizCompletedModal/QuizCompletedModal';
import IncorrectAnswersModal from '../IncorrectAnswersModal/IncorrectAnswersModal';
import TimeUpModal from '../TimeUpModal/TimeUpModal';
import type { QuizQuestion } from '../../../types/train-ai';

interface QuizPlayerProps {
    quizId: string;
    userId: string;
    category: string;
    startTime?: string;
    endTime: string;
    questions: QuizQuestion[];
    onExit: () => void;
}

type ActiveModal = 'saved' | 'completed' | 'review' | 'time-up' | null;

const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
};

const getRemainingSeconds = (endMs: number) => Math.max(0, Math.floor((endMs - Date.now()) / 1000));

/** Time allowed per question; the quiz duration is this multiplied by the number of questions. */
const SECONDS_PER_QUESTION = 2 * 60;

/** Backend timestamps are UTC in `YYYY-MM-DD HH:mm:ss` form. */
const parseServerUtc = (value: string) => new Date(value.replace(' ', 'T') + 'Z').getTime();

const QuizPlayer: React.FC<QuizPlayerProps> = ({ quizId, userId, category, startTime, endTime, questions, onExit }) => {
    const [answers, setAnswers] = useState<Record<number, string>>(() => {
        const initial: Record<number, string> = {};
        questions.forEach((q, idx) => {
            if (q.user_response) initial[idx] = q.user_response;
        });
        return initial;
    });
    const [currentIndex, setCurrentIndex] = useState(() => {
        const firstUnansweredIndex = questions.findIndex((q) => !q.user_response);
        return firstUnansweredIndex === -1 ? questions.length - 1 : firstUnansweredIndex;
    });
    const [activeModal, setActiveModal] = useState<ActiveModal>(null);
    const totalSeconds = questions.length * SECONDS_PER_QUESTION;
    // Duration is derived from the question count, anchored to the server start time so resumed
    // quizzes keep their original deadline. Falls back to the server end time if start is missing.
    const endMs = useMemo(() => {
        const startMs = startTime ? parseServerUtc(startTime) : NaN;
        return Number.isNaN(startMs) ? parseServerUtc(endTime) : startMs + totalSeconds * 1000;
    }, [startTime, endTime, totalSeconds]);
    const [remainingSeconds, setRemainingSeconds] = useState(() => getRemainingSeconds(endMs));

    const saveQuizMutation = useSubmitQuizMutation();
    const submitQuizMutation = useSubmitQuizMutation();
    const incorrectResponsesMutation = useListIncorrectResponsesMutation();

    // Recompute from the end time on every tick instead of decrementing, so throttled or
    // delayed intervals (background tabs, busy main thread, sleep) can't make the timer drift.
    useEffect(() => {
        if (submitQuizMutation.isSuccess) return;
        setRemainingSeconds(getRemainingSeconds(endMs));
        const interval = setInterval(() => setRemainingSeconds(getRemainingSeconds(endMs)), 1000);
        return () => clearInterval(interval);
    }, [endMs, submitQuizMutation.isSuccess]);

    useEffect(() => {
        if (remainingSeconds === 0 && !submitQuizMutation.isSuccess) setActiveModal('time-up');
    }, [remainingSeconds, submitQuizMutation.isSuccess]);

    const today = new Date();
    const dateLabel = today.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
    const progress = Math.round((Object.keys(answers).length / questions.length) * 100);
    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;

    const handleChoiceSelect = (choice: string) => {
        setAnswers((prev) => ({ ...prev, [currentIndex]: choice }));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => prev + 1);
    };

    const buildQuestionsPayload = () =>
        questions.map((q, index) => ({
            question: q.question,
            choices: q.choices,
            user_response: answers[index] ?? '',
        }));

    const handleSaveForLater = () => {
        saveQuizMutation.mutate({ user_id: userId, quiz_code: quizId, type_of_submit: 'resume', questions: buildQuestionsPayload() }, { onSuccess: () => setActiveModal('saved') });
    };

    const handleReviewAnswers = () => {
        incorrectResponsesMutation.mutate(
            { user_id: userId, quiz_code: quizId },
            {
                onSuccess: () => {
                    setActiveModal('review');
                },
            },
        );
    };

    const handleTimeUpSubmit = () => {
        setActiveModal(null);
        handleSubmit();
    };

    const handleSubmit = () => {
        submitQuizMutation.mutate(
            { user_id: userId, quiz_code: quizId, type_of_submit: 'submit', questions: buildQuestionsPayload() },
            {
                onSuccess: (data) => {
                    if (data?.score) {
                        setActiveModal('completed');
                    }
                },
            },
        );
    };

    return (
        <>
            <div className="relative flex flex-col h-full w-full px-10 py-5 bg-white overflow-auto">
                {saveQuizMutation.isPending && <LoadingPlaceholder overlay message="Saving quiz..." />}
                {submitQuizMutation.isPending && <LoadingPlaceholder overlay message="Submitting quiz..." />}

                {/* Header */}
                <div className="text-center mb-5">
                    <h1 className="text-2xl font-bold">
                        <span className="text-(--brand-header-title-color)">Train </span>
                        <span className="text-(--brand-color)">Assist</span>
                    </h1>
                    <p className="text-xs text-(--brand-color) mt-1">Choose an option and press next to move to next question</p>
                </div>

                {/* Info bar */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
                    {/* Left */}
                    <div className="text-xs md:min-w-32">
                        <p className="font-bold text-(--brand-color)">Category: {category}</p>
                        <p className="font-bold text-gray-800 mt-0.5">User ID: {userId}</p>
                    </div>

                    {/* Center — progress */}
                    <div className="flex-1 md:mx-10">
                        <p className="text-xs text-gray-600 mb-1.5 font-medium">{progress}%</p>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                            <div className="h-2 rounded-full bg-(--brand-color) transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                    </div>

                    {/* Right — timer */}
                    <div className="text-xs md:text-right md:min-w-28">
                        <div className="flex items-center gap-1 md:justify-end text-gray-500">
                            <Calendar size={11} />
                            <span>{dateLabel}</span>
                        </div>
                        <div className="flex items-center gap-1 md:justify-end mt-0.5 font-semibold text-gray-700">
                            <Clock size={11} />
                            <span>{formatTime(remainingSeconds)}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 md:text-right">{totalSeconds / 60} min left</p>
                    </div>
                </div>

                {/* Question card */}
                <div className="flex-1 rounded-2xl bg-indigo-50 px-8 py-6">
                    <p className="text-xs text-gray-400 mb-2">
                        Question {currentIndex + 1} of {questions.length}
                    </p>
                    <p className="text-sm text-gray-700 mb-6">{currentQuestion.question}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentQuestion.choices.map((choice, index) => {
                            const isSelected = answers[currentIndex] === choice;
                            const label = String.fromCharCode(65 + index); // 65 is 'A'
                            return (
                                <button
                                    key={choice}
                                    type="button"
                                    onClick={() => handleChoiceSelect(choice)}
                                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-xs text-left transition-all cursor-pointer ${
                                        isSelected ? 'border-(--brand-color) border-2 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                                >
                                    <span className="text-gray-700 flex-1 pr-3">
                                        <strong>{label}.</strong> {choice}
                                    </span>
                                    <div
                                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                            isSelected ? 'border-(--brand-color) bg-(--brand-color)' : 'border-gray-300'
                                        }`}
                                    >
                                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 mt-5 shrink-0">
                    <Modal.ActionButton
                        variant="secondary"
                        onClick={handleSaveForLater}
                        disabled={saveQuizMutation.isPending || submitQuizMutation.isPending}
                        className="w-[50%] max-w-40"
                    >
                        Save For Later
                    </Modal.ActionButton>
                    <Modal.ActionButton
                        variant="primary"
                        onClick={isLastQuestion ? handleSubmit : handleNext}
                        disabled={!answers[currentIndex] || saveQuizMutation.isPending || submitQuizMutation.isPending}
                        className="w-[50%] max-w-40"
                    >
                        {isLastQuestion ? 'Submit' : 'Next'}
                    </Modal.ActionButton>
                </div>
            </div>

            <QuizSavedModal
                isOpen={activeModal === 'saved'}
                quizId={quizId}
                onClose={() => {
                    setActiveModal(null);
                    onExit();
                }}
            />

            <QuizCompletedModal
                isOpen={activeModal === 'completed'}
                score={submitQuizMutation.data?.score ?? ''}
                remarks={submitQuizMutation.data?.remarks ?? ''}
                isLoadingReview={incorrectResponsesMutation.isPending}
                onReviewAnswers={handleReviewAnswers}
                onClose={() => {
                    setActiveModal(null);
                    onExit();
                }}
            />

            <IncorrectAnswersModal
                isOpen={activeModal === 'review'}
                questions={incorrectResponsesMutation.data ?? []}
                onClose={() => {
                    setActiveModal(null);
                    onExit();
                }}
            />

            <TimeUpModal isOpen={activeModal === 'time-up'} onSubmit={handleTimeUpSubmit} />
        </>
    );
};

export default QuizPlayer;
