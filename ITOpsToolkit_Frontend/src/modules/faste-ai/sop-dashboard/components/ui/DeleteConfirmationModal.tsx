import { FaTrashAlt } from 'react-icons/fa';
import Modal from '@/shared/components/ui/Modal/Modal';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    title: string;
    itemName: string;
    isDeleting: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function DeleteConfirmationModal({ isOpen, title, itemName, isDeleting, onClose, onConfirm }: DeleteConfirmationModalProps) {
    return (
        <Modal
            open={isOpen}
            onClose={() => !isDeleting && onClose()}
            size="md"
            className="p-0 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
            <Modal.Body className="p-6 mb-0">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-red-500 text-lg flex items-center shrink-0">
                        <FaTrashAlt />
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
                </div>

                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                    Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">{itemName}</span>? This action will cleanly remove associated
                    vector indexes and cannot be undone.
                </p>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        disabled={isDeleting}
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={isDeleting}
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 min-w-22.5 flex items-center justify-center cursor-pointer"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </Modal.Body>
        </Modal>
    );
}
