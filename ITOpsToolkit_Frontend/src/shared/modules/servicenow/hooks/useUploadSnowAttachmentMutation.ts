import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { uploadSnowAttachment } from '../services/upload-snow-attachment';
import type { SnowNormalizedAttachment } from '../types/attachment';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import type { SnowTableName } from '../types/ticket';

export interface UploadSnowAttachmentVariables {
    tableName: SnowTableName;
    tableSysId: string;
    file: File;
}

export function useUploadSnowAttachmentMutation(options?: Omit<UseMutationOptions<SnowNormalizedAttachment, Error, UploadSnowAttachmentVariables, unknown>, 'mutationFn'>) {
    const queryClient = useQueryClient();
    const { onSuccess, onError, ...restOptions } = options || {};

    return useMutation<SnowNormalizedAttachment, Error, UploadSnowAttachmentVariables, unknown>({
        mutationFn: (variables: UploadSnowAttachmentVariables) => uploadSnowAttachment(variables),
        onSuccess: (data, variables, context) => {
            queryClient.invalidateQueries({
                queryKey: ['snow-attachments', variables.tableName, variables.tableSysId],
            });

            globalAlertDialogEventBus.emit('show-dialog', {
                title: 'Attachment Uploaded',
                note: `File "${variables.file.name}" has been uploaded successfully to ServiceNow.`,
                severity: 'success',
                autoCloseDuration: 4000,
            });

            if (onSuccess) {
                (onSuccess as (d: SnowNormalizedAttachment, v: UploadSnowAttachmentVariables, c: unknown) => void)(data, variables, context);
            }
        },
        onError: (error, variables, context) => {
            globalAlertDialogEventBus.emit('show-dialog', {
                title: 'Upload Failed',
                note: error.message || `Failed to upload file "${variables.file.name}" to ServiceNow.`,
                severity: 'error',
            });

            if (onError) {
                (onError as (e: Error, v: UploadSnowAttachmentVariables, c: unknown) => void)(error, variables, context);
            }
        },
        ...restOptions,
    });
}
