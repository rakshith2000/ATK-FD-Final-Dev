import { useMutation } from '@tanstack/react-query';
import mergeKnowledgeArticles from '../services/merge-knowledge-articles';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import logger from '@/shared/utils/logger';
import getErrorTitle from '@/api/utils/get-error-title';
import axios from 'axios';

export function useMergeKnowledgeArticlesMutation() {
    return useMutation({
        mutationFn: ({ articles, signal }: { articles: Record<string, string>; signal?: AbortSignal }) => mergeKnowledgeArticles(articles, signal),

        onError: (error) => {
            if (axios.isCancel(error)) return;
            globalAlertDialogEventBus.emit('show-dialog', {
                title: getErrorTitle(error),
                note: error?.message,
                priority: 'normal',
                severity: 'error',
                buttonText: 'Dismiss',
            });
        },

        onSuccess: (data) => {
            logger.debug(data);
        },
    });
}
