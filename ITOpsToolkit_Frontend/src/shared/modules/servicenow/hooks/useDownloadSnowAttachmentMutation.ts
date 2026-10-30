import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { downloadSnowAttachment } from '../services/download-snow-attachment';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';

export interface DownloadSnowAttachmentVariables {
    attachmentSysId: string;
    fileName: string;
}

export function useDownloadSnowAttachmentMutation(
    options?: Omit<UseMutationOptions<{ blob: Blob; filename: string }, Error, DownloadSnowAttachmentVariables, unknown>, 'mutationFn'>,
) {
    const { onSuccess, onError, ...restOptions } = options || {};

    return useMutation<{ blob: Blob; filename: string }, Error, DownloadSnowAttachmentVariables, unknown>({
        mutationFn: (variables: DownloadSnowAttachmentVariables) => downloadSnowAttachment(variables),
        onSuccess: (data, variables, context) => {
            const url = window.URL.createObjectURL(data.blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', data.filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            globalAlertDialogEventBus.emit('show-dialog', {
                title: 'Attachment Downloaded',
                note: `File "${data.filename}" downloaded successfully.`,
                severity: 'success',
                autoCloseDuration: 3500,
            });

            if (onSuccess) {
                (onSuccess as (d: { blob: Blob; filename: string }, v: DownloadSnowAttachmentVariables, c: unknown) => void)(data, variables, context);
            }
        },
        onError: (error, variables, context) => {
            globalAlertDialogEventBus.emit('show-dialog', {
                title: 'Download Failed',
                note: error.message || `Failed to download file "${variables.fileName}".`,
                severity: 'error',
            });

            if (onError) {
                (onError as (e: Error, v: DownloadSnowAttachmentVariables, c: unknown) => void)(error, variables, context);
            }
        },
        ...restOptions,
    });
}
