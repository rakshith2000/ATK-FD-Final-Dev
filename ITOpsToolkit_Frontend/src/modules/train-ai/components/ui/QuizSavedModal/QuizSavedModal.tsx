import { CheckCircle } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import Modal from '@/shared/components/ui/Modal/Modal';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import CopyText from '@/shared/components/ui/CopyText/CopyText';

interface QuizSavedModalProps {
    isOpen: boolean;
    quizId: string;
    onClose: () => void;
}

const QuizSavedModal: React.FC<QuizSavedModalProps> = ({ isOpen, quizId, onClose }) => {
    const navigate = useNavigate();

    const handleOk = () => {
        onClose();
        navigate({ to: '/transition-ai/train-ai/train-history' });
    };

    return (
        <Modal open={isOpen} onClose={onClose} size="md" closeOnOutsideClick={false}>
            <Modal.Header className=" mb-0 bg-(--brand-color) border-b-(--brand-color) text-(--brand-text-inverse) font-semibold text-sm 2xl:text-base">
                <TitleWithArraow title="QUIZ IS SAVED SUCCESSFULLY" className="text-sm font-extrabold uppercase text-(--brand-text-inverse) items-center" />
            </Modal.Header>

            <Modal.Body className="px-4 pt-2 overflow-visible">
                <div className="rounded border border-green-200 bg-green-50 p-4 flex flex-col gap-3 overflow-visible">
                    <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-500 shrink-0" />
                        <CopyText text={quizId}>{() => <span className="text-sm font-bold text-(--brand-color)">Quiz ID: {quizId}</span>}</CopyText>
                    </div>
                    <p className="text-xs text-gray-700">
                        Using Quiz ID <span className="font-semibold text-(--brand-color)">{quizId}</span> you can resume the quiz later!
                    </p>
                </div>
            </Modal.Body>

            <Modal.Footer className="justify-center px-4 pb-3 pt-1">
                <Modal.ActionButton variant="primary" onClick={handleOk} className=" w-[50%] max-w-40">
                    OK
                </Modal.ActionButton>
            </Modal.Footer>
        </Modal>
    );
};

export default QuizSavedModal;
