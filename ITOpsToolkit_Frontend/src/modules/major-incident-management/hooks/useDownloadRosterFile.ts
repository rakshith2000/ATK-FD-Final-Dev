import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { downloadRosterFile, type RosterConfigFileType } from '../services/roster.service';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';

export function useDownloadRosterFile(options?: Omit<UseMutationOptions<{ blob: Blob; filename: string }, Error, RosterConfigFileType, unknown>, 'mutationFn'>) {
    const { onSuccess, onError, ...restOptions } = options || {};

    return useMutation<{ blob: Blob; filename: string }, Error, RosterConfigFileType, unknown>({
        mutationFn: (fileType: RosterConfigFileType) => downloadRosterFile(fileType),
        onSuccess: (data, variables, context) => {
            const url = window.URL.createObjectURL(data.blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', data.filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            const fileTypeLabel = variables === 'template' ? 'Sample Roster Template' : 'Active Roster';
            globalAlertDialogEventBus.emit('show-dialog', {
                title: 'Roster Download Completed',
                note: `${fileTypeLabel} file "${data.filename}" downloaded successfully.`,
                severity: 'success',
            });

            if (onSuccess) {
                (onSuccess as (d: { blob: Blob; filename: string }, v: RosterConfigFileType, c: unknown) => void)(data, variables, context);
            }
        },
        onError: (error, variables, context) => {
            const fileTypeLabel = variables === 'template' ? 'sample roster template' : 'roster file';
            globalAlertDialogEventBus.emit('show-dialog', {
                title: 'Roster Download Failed',
                note: error.message || `An error occurred while downloading the ${fileTypeLabel}.`,
                severity: 'error',
            });

            if (onError) {
                (onError as (e: Error, v: RosterConfigFileType, c: unknown) => void)(error, variables, context);
            }
        },
        ...restOptions,
    });
}
