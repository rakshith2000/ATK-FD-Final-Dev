import globalAlertDialogEventBus from '../components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import logger from '../utils/logger';
import { getChangedFields } from '../utils/tanstack-form-utils';
import type { FormSubmitGuardType } from '../modules/dynamic-form/types';

/** Submit guard types - checked before form submission.
 *  - `'no-changes'`: Warns if no fields changed (update mode only by default)
 *  - `'confirm-before-submit'`: Shows confirmation dialog before submitting */
export type FormSubmitGuard = 'no-changes' | 'confirm-before-submit';

interface UseFormSubmitGuardOptions<T extends Record<string, unknown>, R = void> {
    getValues: () => T;
    defaultValues: T;
    guards?: FormSubmitGuardType[];
    onSubmit: (payload: T | Partial<T>) => Promise<R>;
    submitWithValues?: 'changed-only' | 'all-values';
    noChangesTitle?: string;
    noChangesNote?: string;
    confirmTitle?: string;
    confirmMessage?: string;
    confirmProceedLabel?: string;
    confirmDiscardLabel?: string;
}

interface UseFormSubmitGuardReturn<R = void> {
    guardedOnSubmit: () => Promise<R | undefined>;
    getChanges: () => ReturnType<typeof getChangedFields>;
}

export const useFormSubmitGuard = <T extends Record<string, unknown>, R = void>({
    getValues,
    defaultValues,
    guards = ['no-changes'],
    onSubmit,
    submitWithValues = 'changed-only',
    noChangesTitle = "Nothing's changed",
    noChangesNote = 'No changes detected. Please modify the form before submitting.',
    confirmTitle = 'Are you sure?',
    confirmMessage = 'Do you really want to submit the form with the current changes?',
    confirmDiscardLabel = 'Discard',
    confirmProceedLabel = 'Proceed',
}: UseFormSubmitGuardOptions<T, R>): UseFormSubmitGuardReturn<R> => {
    logger.debug('Initializing useFormSubmitGuard with defaultValues:', defaultValues, 'guards:', guards);

    const getChanges = () => getChangedFields(getValues() || defaultValues, defaultValues);

    const guardedOnSubmit = async (): Promise<R | undefined> => {
        const changedFields = getChanges();
        logger.debug('Changed fields on submit:', changedFields);

        // Guard: no-changes
        if (guards.includes('no-changes') && changedFields.length === 0) {
            globalAlertDialogEventBus.emit('show-dialog', {
                title: noChangesTitle,
                note: noChangesNote,
                severity: 'warning',
            });
            return undefined;
        }

        // Guard: confirm-before-submit
        if (guards.includes('confirm-before-submit')) {
            const confirmed = await new Promise<boolean>((resolve) => {
                globalAlertDialogEventBus.emit('show-dialog', {
                    title: confirmTitle,
                    note: confirmMessage,
                    severity: 'info',
                    actions: [
                        {
                            label: confirmProceedLabel,
                            variant: 'info',
                            onClick: () => resolve(true),
                        },
                        {
                            label: confirmDiscardLabel,
                            variant: 'warning',
                            onClick: () => resolve(false),
                        },
                    ],
                });
            });

            if (!confirmed) return undefined;
        }

        const payload = (submitWithValues === 'all-values' ? getValues() : Object.fromEntries(changedFields.map(({ path, value }) => [path, value]))) as Partial<T>;

        return await onSubmit(payload);
    };

    return { guardedOnSubmit, getChanges };
};
