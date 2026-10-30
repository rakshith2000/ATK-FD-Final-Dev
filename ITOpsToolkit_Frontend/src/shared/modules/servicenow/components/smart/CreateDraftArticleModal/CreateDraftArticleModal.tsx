import React from 'react';
import Modal from '@/shared/components/ui/Modal/Modal';
import CreateKBArticleForm from '../CreateKBArticleForm/CreateKBArticleForm';
import type { CreateKnowledgeArticleResposne } from '../../../types/knowledge';

export interface CreateDraftArticleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmitSuccess: (data: CreateKnowledgeArticleResposne, values?: { kb_knowledge_base: string; kb_category: string }) => Promise<void>;
    shortDescription: string;
    articleText: string;
    defaultValues?: {
        kb_category?: string;
        kb_knowledge_base?: string;
    };
    title?: string;
}

const CreateDraftArticleModal: React.FC<CreateDraftArticleModalProps> = ({
    isOpen,
    onClose,
    onSubmitSuccess,
    shortDescription,
    articleText,
    defaultValues,
    title = 'Create ServiceNow Draft Article',
}) => {
    return (
        <Modal size="xl" open={isOpen} onClose={onClose} closeOnEscapeKeyDown={false} closeOnOutsideClick={false} className="p-5">
            <Modal.Header>
                <h2 className="text-sm font-semibold text-(--brand-title-primary-color)">{title}</h2>
            </Modal.Header>
            <Modal.Body className="p-2">
                <CreateKBArticleForm
                    shortDescription={shortDescription}
                    articleText={articleText}
                    defaultValues={{
                        kb_category: defaultValues?.kb_category ?? '',
                        kb_knowledge_base: defaultValues?.kb_knowledge_base ?? '',
                    }}
                    onSubmitSuccess={onSubmitSuccess}
                />
            </Modal.Body>
        </Modal>
    );
};

export default CreateDraftArticleModal;
