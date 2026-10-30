import { AlertTriangle } from 'lucide-react';
import Modal from '@/shared/components/ui/Modal/Modal';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import CopyText from '@/shared/components/ui/CopyText/CopyText';
import { LoadingPlaceholder } from '@/shared/components/ui/Placeholders';
import type { QuizDifficultyLevel } from '../../../types/train-ai';

const DIFFICULTY_LEVELS: QuizDifficultyLevel[] = ['Beginner', 'Specialist', 'Expert'];

interface GenerateQuizSuccessModalProps {
    isOpen: boolean;
    /** Quiz id once generated; empty string while difficulty is still being selected. */
    quizId: string;
    passingThreshold: number;
    difficultyLevel: QuizDifficultyLevel;
    isGenerating: boolean;
    onDifficultyChange: (level: QuizDifficultyLevel) => void;
    onGenerate: () => void;
    onClose: () => void;
    onStartQuiz: () => void;
}

const GenerateQuizSuccessModal: React.FC<GenerateQuizSuccessModalProps> = ({
    isOpen,
    quizId,
    passingThreshold,
    difficultyLevel,
    isGenerating,
    onDifficultyChange,
    onGenerate,
    onClose,
    onStartQuiz,
}) => {
    const isGenerated = !!quizId;

    return (
        <Modal
            open={isOpen}
            // The close (X) button is always available; once generated, the quiz can still be started later from History.
            // Escape is only allowed before generation, and outside-click never closes the popup.
            onClose={onClose}
            size="md"
            closeOnOutsideClick={false}
            closeOnEscapeKeyDown={!isGenerated}
        >
            {isGenerating && <LoadingPlaceholder overlay message="Generating quiz..." />}

            <Modal.Header className=" mb-0 bg-(--brand-color) border-b-(--brand-color) text-(--brand-text-inverse) font-semibold text-sm 2xl:text-base">
                <TitleWithArraow
                    title={isGenerated ? 'QUIZ SUCCESSFULLY GENERATED' : 'GENERATE QUIZ'}
                    className="text-sm font-extrabold uppercase text-(--brand-text-inverse) items-center"
                />
            </Modal.Header>

            <Modal.Body className="px-4 pt-2  overflow-visible">
                {isGenerated ? (
                    <div className="rounded border border-blue-200 bg-blue-50 p-4 flex flex-col gap-3 overflow-visible">
                        <CopyText text={quizId}>{() => <span className="text-sm font-bold text-(--brand-color)">Quiz ID: {quizId}</span>}</CopyText>
                        <div className="flex items-start gap-2">
                            <AlertTriangle size={14} className="text-orange-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-700">You need to get at least {passingThreshold}% to pass the quiz.</p>
                        </div>
                    </div>
                ) : (
                    <div className="rounded border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3">
                        <p className="text-sm font-semibold text-gray-700">Select difficulty level</p>
                        <div className="flex flex-col gap-2">
                            {DIFFICULTY_LEVELS.map((level) => (
                                <label key={level} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                                    <input
                                        type="radio"
                                        name="quiz-difficulty"
                                        value={level}
                                        checked={difficultyLevel === level}
                                        onChange={() => onDifficultyChange(level)}
                                        disabled={isGenerating}
                                        className="accent-(--brand-color) cursor-pointer disabled:cursor-not-allowed"
                                    />
                                    {level}
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer className="justify-center gap-2 px-4 pb-3 pt-1">
                {isGenerated ? (
                    <Modal.ActionButton variant="primary" onClick={onStartQuiz} className=" w-[60%] max-w-48">
                        Start Quiz
                    </Modal.ActionButton>
                ) : (
                    <>
                        <Modal.ActionButton variant="secondary" onClick={onClose} disabled={isGenerating} className=" w-[50%] max-w-40">
                            Cancel
                        </Modal.ActionButton>
                        <Modal.ActionButton variant="primary" onClick={onGenerate} disabled={isGenerating} className=" w-[50%] max-w-40">
                            {isGenerating ? 'Generating...' : 'Generate Quiz'}
                        </Modal.ActionButton>
                    </>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default GenerateQuizSuccessModal;
