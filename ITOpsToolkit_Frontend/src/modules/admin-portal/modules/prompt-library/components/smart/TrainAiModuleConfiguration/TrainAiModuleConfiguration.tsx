import { useEffect, useState } from 'react';
import { Save, Plus, ListChecks } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { SelectInput } from '@/shared/components/ui/InputFields';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import logger from '@/shared/utils/logger';
import { useUpdateModuleConfigurationMutation } from '../../../hooks/useUpdateModuleConfigurationMutation';
import { useOnboardModuleConfigurationMutation } from '../../../hooks/useOnboardModuleConfigurationMutation';
import { useGetModuleConfigsQuery } from '../../../hooks/useGetModuleConfigsQuery';
import quizQuestionsOptions, { NUMBER_OF_QUESTIONS_PER_QUIZ_PARAMETER, TRAIN_ASSIST_MODULE } from '../../../contants/quiz-questions-options';

interface TrainAiModuleConfigurationProps {
    className?: string;
}

const TrainAiModuleConfiguration: React.FC<TrainAiModuleConfigurationProps> = ({ className }) => {
    const [value, setValue] = useState<string>('');
    // The value currently persisted on the backend (empty string when nothing is onboarded yet).
    const [savedValue, setSavedValue] = useState<string>('');

    const configQuery = useGetModuleConfigsQuery({
        payload: { module: TRAIN_ASSIST_MODULE, parameter: NUMBER_OF_QUESTIONS_PER_QUIZ_PARAMETER },
        enabled: true,
    });

    const updateMutation = useUpdateModuleConfigurationMutation();
    const onboardMutation = useOnboardModuleConfigurationMutation();

    // Populate the dropdown once the existing configuration has been fetched.
    const existingConfig = configQuery.data?.data?.[0];
    useEffect(() => {
        const nextValue = existingConfig?.value ?? '';
        setValue(nextValue);
        setSavedValue(nextValue);
    }, [existingConfig?.value]);

    // When there is no persisted value we are onboarding a new configuration; otherwise we update it.
    const isOnboarding = !existingConfig;
    const isSubmitting = updateMutation.isPending || onboardMutation.isPending;

    const handleSubmit = async () => {
        if (!value) return;

        const payload = {
            module: TRAIN_ASSIST_MODULE,
            parameter: NUMBER_OF_QUESTIONS_PER_QUIZ_PARAMETER,
            value,
        };

        const response = isOnboarding ? await onboardMutation.mutateAsync({ payload }) : await updateMutation.mutateAsync({ payload });

        logger.debug(`Module configuration ${isOnboarding ? 'onboarded' : 'updated'} successfully with response:`, response);

        // Refetch so the component reflects the newly persisted value and switches to "update" mode.
        setSavedValue(value);
        await configQuery.refetch();

        globalAlertDialogEventBus.emit('show-dialog', {
            title: isOnboarding ? 'Configuration onboarded' : 'Configuration updated',
            note: response?.message ?? `Number of questions for quiz ${isOnboarding ? 'onboarded' : 'updated'} successfully.`,
            severity: 'success',
            priority: 'normal',
            buttonText: 'Dismiss',
            autoCloseDuration: 3000,
        });
    };

    const isLoadingConfig = configQuery.isLoading;
    // In update mode the button stays disabled until the user changes the value; in onboard mode any selection enables it.
    const isSubmitDisabled = !value || isSubmitting || isLoadingConfig || (!isOnboarding && value === savedValue);

    return (
        <div
            className={twMerge(
                'flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-(--brand-border-color) bg-gradient-to-r from-(--brand-color)/5 to-transparent px-4 py-2.5',
                className,
            )}
        >
            {/* Left: icon + title block */}
            <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-(--brand-color)/10 text-(--brand-color)">
                    <ListChecks size={16} />
                </span>
                <div className="flex flex-col leading-tight">
                    <label htmlFor="number-of-questions-for-quiz" className="text-[0.78rem] font-semibold text-(--brand-title-primary-color)">
                        Number of questions for quiz
                    </label>
                    <span className="text-[0.65rem] text-(--brand-text-muted-color)">Set how many questions each quiz should contain</span>
                </div>
            </div>

            {/* Right: dropdown + submit as one control cluster */}
            <div className="flex items-center gap-2">
                <SelectInput
                    id="number-of-questions-for-quiz"
                    value={value}
                    onChange={setValue}
                    options={quizQuestionsOptions}
                    disabled={isSubmitting || isLoadingConfig}
                    isLoading={isLoadingConfig}
                    error={configQuery.isError}
                    errorMessage={configQuery.isError ? (configQuery.error?.message ?? 'Failed to load configuration') : undefined}
                    onRetry={configQuery.isError ? () => configQuery.refetch() : undefined}
                    onRefetch={() => configQuery.refetch()}
                    placeholder="Select"
                    className="w-32"
                    triggerClassName="h-[30px] rounded-md text-[0.72rem] font-medium text-(--brand-text-color)"
                    data-field="number_of_questions_for_quiz"
                />
                <FormActionButton
                    isSubmitting={isSubmitting}
                    disabled={isSubmitDisabled}
                    onClick={handleSubmit}
                    label={isOnboarding ? 'Onboard' : 'Update'}
                    submittingLabel={isOnboarding ? 'Onboarding...' : 'Updating...'}
                    icon={isOnboarding ? <Plus size={14} /> : <Save size={14} />}
                    variant="brand"
                    className="min-w-max px-5 py-[7px]"
                />
            </div>
        </div>
    );
};

export default TrainAiModuleConfiguration;
