import { Trophy, AlertTriangle, Loader2 } from 'lucide-react';
import Modal from '@/shared/components/ui/Modal/Modal';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';

interface QuizCompletedModalProps {
    isOpen: boolean;
    score: string;
    remarks: string;
    isLoadingReview?: boolean;
    onReviewAnswers: () => void;
    onClose: () => void;
}

const QuizCompletedModal: React.FC<QuizCompletedModalProps> = ({ isOpen, score, remarks, isLoadingReview = false, onReviewAnswers, onClose }) => {
    const isPassed = remarks.trim().toLowerCase() === 'pass';
    const parsedScore = parseFloat(score.replace('%', ''));
    const roundedScore = Number.isNaN(parsedScore) ? 0 : Math.round(parsedScore);
    const hasPerfectScore = !Number.isNaN(parsedScore) && parsedScore === 100;

    return (
        <Modal open={isOpen} onClose={isLoadingReview ? undefined : onClose} size="md" closeOnOutsideClick={false}>
            <Modal.Header className="mb-0 bg-(--brand-color) border-b-(--brand-color) text-(--brand-text-inverse) font-semibold text-sm 2xl:text-base">
                <TitleWithArraow title="QUIZ COMPLETED SUCCESSFULLY" className="text-sm font-extrabold uppercase text-(--brand-text-inverse) items-center" />
            </Modal.Header>

            <Modal.Body className="px-4 pt-2">
                <div className={`rounded border p-4 flex flex-col gap-3 ${isPassed ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
                    <div className="flex items-center gap-2">
                        {isPassed ? <Trophy size={16} className="text-green-500 shrink-0" /> : <AlertTriangle size={16} className="text-orange-500 shrink-0" />}
                        <p className="text-sm font-bold text-(--brand-color)">Your Score is {roundedScore} % </p>
                    </div>
                    <p className={`text-xs font-semibold ${isPassed ? 'text-green-600' : 'text-orange-600'}`}>
                        {isPassed ? 'Congratulations! You passed!' : 'Failed! Please try again'}
                    </p>
                </div>
            </Modal.Body>

            <Modal.Footer className="justify-center px-4 pb-3 pt-1 gap-2">
                {!hasPerfectScore && (
                    <Modal.ActionButton variant="secondary" onClick={onReviewAnswers} disabled={isLoadingReview} className="w-[50%] max-w-40">
                        {isLoadingReview ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Loading...</span>
                            </>
                        ) : (
                            'Review Incorrect Answers'
                        )}
                    </Modal.ActionButton>
                )}
                <Modal.ActionButton variant="primary" onClick={onClose} disabled={isLoadingReview} className="w-[50%] max-w-40">
                    OK
                </Modal.ActionButton>
            </Modal.Footer>
        </Modal>
    );
};

export default QuizCompletedModal;
