import type { FormMode } from '../types/form';

export interface FieldDisableInfo<TMode extends FormMode = FormMode> {
    fieldName: string;
    mode: TMode;
    value: unknown;
}

export interface ResolveFieldDisabledOptions<TMode extends FormMode = FormMode> {
    fieldName: string;
    mode: TMode;
    value: unknown;
    canEdit?: boolean;
    isSubmissionInProgress: boolean;
    isFieldDisabled?: (info: FieldDisableInfo<TMode>) => boolean | undefined;
}

export const resolveFieldDisabled = <TMode extends FormMode = FormMode>({
    fieldName,
    mode,
    value,
    canEdit = true,
    isSubmissionInProgress,
    isFieldDisabled,
}: ResolveFieldDisabledOptions<TMode>): boolean => {
    // submission always wins
    if (isSubmissionInProgress) return true;

    // callback takes priority if it returns a boolean
    const callbackResult = isFieldDisabled?.({ fieldName, mode, value });
    if (callbackResult !== undefined) return callbackResult;

    // delete -> all disabled
    if (mode === 'delete') return true;

    if (mode === 'view') return true;

    // update -> respect canEdit from config
    if (mode === 'update') return !canEdit;

    // create (or any other mode) -> all enabled
    return false;
};
