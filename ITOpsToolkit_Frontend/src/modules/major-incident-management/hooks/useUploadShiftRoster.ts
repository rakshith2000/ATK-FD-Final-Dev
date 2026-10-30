import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { uploadShiftRoster, type UploadShiftRosterResponse } from '../services/roster.service';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';

export function useUploadShiftRoster(options?: Omit<UseMutationOptions<UploadShiftRosterResponse, Error, File, unknown>, 'mutationFn'>) {
    const { onSuccess, onError, ...restOptions } = options || {};

    return useMutation<UploadShiftRosterResponse, Error, File, unknown>({
        mutationFn: (file: File) => uploadShiftRoster(file),
        onSuccess: (data, variables, context) => {
            globalAlertDialogEventBus.emit('show-dialog', {
                title: 'Roster Uploaded Successfully',
                note: data.message || 'Shift roster file has been uploaded and processed successfully.',
                severity: 'success',
            });
            if (onSuccess) {
                (onSuccess as (d: UploadShiftRosterResponse, v: File, c: unknown) => void)(data, variables, context);
            }
        },
        onError: (error, variables, context) => {
            globalAlertDialogEventBus.emit('show-dialog', {
                title: 'Roster Upload Failed',
                note: error.message || 'An error occurred while uploading the shift roster file.',
                severity: 'error',
            });
            if (onError) {
                (onError as (e: Error, v: File, c: unknown) => void)(error, variables, context);
            }
        },
        ...restOptions,
    });
}
