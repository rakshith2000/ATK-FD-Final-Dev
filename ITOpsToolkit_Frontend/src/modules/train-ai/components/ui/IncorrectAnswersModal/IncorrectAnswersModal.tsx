import { XCircle } from 'lucide-react';
import Modal from '@/shared/components/ui/Modal/Modal';
import type { QuizQuestion } from '../../../types/train-ai';

interface IncorrectAnswersModalProps {
    isOpen: boolean;
    questions: QuizQuestion[];
    onClose: () => void;
}

const IncorrectAnswersModal: React.FC<IncorrectAnswersModalProps> = ({ isOpen, questions, onClose }) => {
    return (
        <Modal open={isOpen} onClose={onClose} size="4xl" closeOnOutsideClick={false}>
            <Modal.Header className="p-2 mb-0 bg-(--brand-color) border-b-(--brand-color) text-(--brand-text-inverse) font-semibold text-sm 2xl:text-base justify-center">
                <h2 className="text-base font-semibold text-(--brand-text-inverse)">Incorrect Answers</h2>
            </Modal.Header>

            <Modal.Body className="px-2 max-h-[65dvh]">
                <div className="border border-blue-200 rounded-lg p-4 flex flex-col divide-y divide-gray-100">
                    {questions.map((q, index) => (
                        <div key={index} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                            <p className="text-sm text-gray-800 leading-snug">
                                <span className="font-bold">Q{index + 1}:</span> {q.question}
                            </p>

                            <div className="flex items-center gap-1.5">
                                <XCircle size={14} className="text-red-500 shrink-0" />
                                <span className="text-xs font-medium text-red-500">Your Answer: {q.user_response || <span className="italic">Not Answered</span>}</span>
                            </div>

                            <div className="ml-1">
                                <p className="text-xs text-gray-500 mb-1">Choices:</p>
                                <ul className="ml-6 flex flex-col gap-0.5">
                                    {q.choices.map((choice) => (
                                        <li key={choice} className="text-xs text-gray-600">
                                            {choice}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal.Body>

            <Modal.Footer className="justify-end px-4 pb-3 pt-2">
                <Modal.ActionButton variant="primary" onClick={onClose} className="rounded-full px-6 text-xs font-semibold flex-none">
                    Close
                </Modal.ActionButton>
            </Modal.Footer>
        </Modal>
    );
};

export default IncorrectAnswersModal;
