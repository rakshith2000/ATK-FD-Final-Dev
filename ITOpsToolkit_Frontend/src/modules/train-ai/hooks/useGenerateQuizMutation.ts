import { useMutation } from '@tanstack/react-query';
import generateQuiz from '../services/generate-quiz';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import getErrorTitle from '@/api/utils/get-error-title';
import type { QuizDifficultyLevel } from '../types/train-ai';

interface GenerateQuizVariables {
    articlesNumber: string[];
    difficultyLevel: QuizDifficultyLevel;
}

export const useGenerateQuizMutation = () => {
    return useMutation({
        mutationFn: ({ articlesNumber, difficultyLevel }: GenerateQuizVariables) => generateQuiz(articlesNumber, difficultyLevel),
        onError: (error) => {
            globalAlertDialogEventBus.emit('show-dialog', {
                title: getErrorTitle(error),
                note: error?.message,
                priority: 'normal',
                severity: 'error',
                buttonText: 'Dismiss',
            });
        },
    });
};
