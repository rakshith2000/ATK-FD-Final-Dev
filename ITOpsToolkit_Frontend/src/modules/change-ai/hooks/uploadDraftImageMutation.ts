import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
// import { uploadShiftRoster, type UploadShiftRosterResponse } from '../services/roster.service';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import uploadDraftImage from '../services/upload-draft-image';
import globalAlertToastEventBus from '@/shared/components/smart/GlobalAlertToast/global-alert-toast-event-bus';

export function useUploadDraftImage(options?: Omit<UseMutationOptions<uploadDraftImage, Error, File, unknown>, 'mutationFn'>) {
    const { onSuccess, onError, ...restOptions } = options || {};

    return useMutation<uploadDraftImage, Error, File, unknown>({
        mutationFn: (file: File) => uploadDraftImage(file),
        onSuccess: (data, variables, context) => {
            globalAlertToastEventBus.emit('show-alert-toast', {
                title: 'Image Uploaded Successfully',
                severity: 'success',
            });
            if (onSuccess) {
                (onSuccess as (d: uploadDraftImage, v: File, c: unknown) => void)(data, variables, context);
            }
        },
        onError: (error, variables, context) => {
            globalAlertDialogEventBus.emit('show-dialog', {
                title: 'File Upload Failed',
                note: error.message || 'An error occurred while uploading the image file.',
                severity: 'error',
            });
            if (onError) {
                (onError as (e: Error, v: File, c: unknown) => void)(error, variables, context);
            }
        },
        ...restOptions,
    });
}
