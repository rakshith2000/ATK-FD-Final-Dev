import { useLiteLLMProxyListQuery } from '../../../hooks/useLiteLLMProxyListQuery';
import { FaServer } from 'react-icons/fa';
import { ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';
import LiteLLMProxyForm from '../LiteLLMProxyFrom/LiteLLMProxyFrom';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';

const LiteLLMProxyConfig = () => {
    const liteLLMProxyListQuery = useLiteLLMProxyListQuery();

    const hasCurrentProxy = Object.keys(liteLLMProxyListQuery?.data ?? {}).length > 0;

    const currentProxy = liteLLMProxyListQuery.data;

    const handleOnSuccess = async ({ message }: { message: string }) => {
        liteLLMProxyListQuery.refetch();
        globalAlertDialogEventBus.emit('show-dialog', {
            title: 'Success',
            note: message,
            severity: 'success',
        });
    };

    return (
        <div className="flex h-full min-h-0 flex-col gap-4 shadow border border-(--brand-border-color) rounded-md overflow-auto bg-white">
            {/* Header */}
            <div className="flex items-center gap-2.5 p-2 bg-(--brand-color) border-b-2 border-(--brand-border-color)">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-(--brand-color)">
                    <FaServer size={16} className="text-(--brand-text-inverse)" />
                </div>
                <h1 className="text-xs font-semibold text-(--brand-text-inverse)">Lite LLM Proxy</h1>
            </div>

            {/* Form Card */}
            <div className="mx-auto w-full max-w-2xl rounded-xl border border-(--brand-border-color) bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 border-b border-(--brand-border-color) bg-(--brand-color)/3 px-4 py-2.5">
                    <span className="size-1.5 rounded-full bg-(--brand-color)" />
                    <span className="text-xs font-semibold text-(--brand-title-primary-color)">{hasCurrentProxy ? 'Lite LLM Proxy Details' : 'Onboard Lite LLM Proxy'}</span>
                </div>
                <div className="p-2">
                    {liteLLMProxyListQuery.isLoading || liteLLMProxyListQuery.isRefetching ? <GridSkeleton cols={1} /> : null}

                    {liteLLMProxyListQuery.isError || liteLLMProxyListQuery.isRefetchError ? (
                        <ErrorPlaceholder
                            iconSize={100}
                            error={liteLLMProxyListQuery.error}
                            onRetry={liteLLMProxyListQuery.refetch}
                            isRefetching={liteLLMProxyListQuery.isRefetching}
                        />
                    ) : null}
                </div>

                {liteLLMProxyListQuery.isSuccess && !(liteLLMProxyListQuery.isLoading || liteLLMProxyListQuery.isRefetching) ? (
                    <>
                        {hasCurrentProxy ? (
                            <LiteLLMProxyForm
                                mode="delete"
                                initialValues={{
                                    ...currentProxy,
                                }}
                                onSubmitSuccess={handleOnSuccess}
                            />
                        ) : (
                            <LiteLLMProxyForm mode="create" onSubmitSuccess={handleOnSuccess} />
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default LiteLLMProxyConfig;
