import { Archive } from 'lucide-react';
import type { MeetingId } from '@/modules/meeting-ai/types/meeting-ai';
import { useMeetingArchivedArticlesQuery } from '@/modules/meeting-ai/hooks/useMeetingArchivedArticlesQuery';
import Modal from '@/shared/components/ui/Modal/Modal';
import { LoadingPlaceholder, ErrorPlaceholder, EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import ArchivedArticleCard from '../../ui/ArchivedArticleCard/ArchivedArticleCard';

export interface MeetingArchivedArticlesModalProps {
    open: boolean;
    meetingId: MeetingId;
    onClose: () => void;
}

const MeetingArchivedArticlesModal: React.FC<MeetingArchivedArticlesModalProps> = ({ open, meetingId, onClose }) => {
    const { data: articles, isLoading, isError, error, refetch, isRefetching } = useMeetingArchivedArticlesQuery(open ? meetingId : '');

    return (
        <Modal open={open} onClose={onClose} size="3xl" className="pb-5">
            <Modal.Header className="bg-(--brand-color) border-b-(--brand-color) text-(--brand-text-inverse) p-2">
                <Archive size={16} />
                <span className="text-sm font-bold ">Archived Articles</span>
            </Modal.Header>
            <Modal.Body className="max-h-[60vh] overflow-y-auto px-3">
                {isLoading && <LoadingPlaceholder message="Loading archived articles..." />}
                {isError && <ErrorPlaceholder error={error} onRetry={() => refetch()} isRefetching={isRefetching} />}
                {!isLoading && !isError && !articles?.length && <EmptyPlaceholder message="No archived articles found" />}
                {!isLoading && !isError && articles && articles.length > 0 && (
                    <div className="flex flex-col gap-2 py-2">
                        {articles.map((article) => (
                            <ArchivedArticleCard key={article.id} article={article} />
                        ))}
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer className="justify-end px-3">
                <Modal.ActionButton onClick={onClose} className="max-w-32 btn-split split-white-blue-light">
                    Close
                </Modal.ActionButton>
            </Modal.Footer>
        </Modal>
    );
};

MeetingArchivedArticlesModal.displayName = 'MeetingArchivedArticlesModal';

export default MeetingArchivedArticlesModal;
