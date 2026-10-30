import { RefreshCw } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { ErrorCauseRenderer } from '@/shared/components/ui/ErrorCauseRenderer/ErrorCauseRenderer';
import getErrorTitle from '@/api/utils/get-error-title';
import ShellLayout from '../ShellLayout/ShellLayout';
import { ServerErrorIcon } from './ServerErrorIcon';
import { NotFoundIcon } from './NotFoundIcon';
import { UnauthorizedIcon } from './UnauthorizedIcon';
import type { AxiosError, AxiosResponse } from 'axios';
import logger from '@/shared/utils/logger';

interface ErrorPlaceholderProps {
    title?: string;
    error?: Error | null;
    onRetry?: () => unknown;
    isRefetching?: boolean;
    retryLabel?: string;
    iconSize?: number;
    overlay?: boolean;
    className?: string;
}

// Helper to select icon based on error
const getErrorIcon = (error?: Error | null, size = 50) => {
    logger.debug({ size });
    const mayBeAxiosError = (error as AxiosError) || undefined;
    let code;
    if (mayBeAxiosError?.isAxiosError) {
        const response: AxiosResponse | undefined = mayBeAxiosError.response;
        code = response?.status;
    }

    // Convert to number or string check for flexibility
    switch (Number(code)) {
        case 500:
            return <ServerErrorIcon size={size} className="text-red-400 shrink-0" />;
        case 403:
            return <UnauthorizedIcon size={size} iconcolor="#1760deff" iconbadgeBgColor="#EF4444" iconbadgeColor="#FFFFFF" className="text-red-400 shrink-0" />;
        case 404:
            return <NotFoundIcon size={size} className="text-red-400 shrink-0" />;
        default:
            return <NotFoundIcon size={size} className="text-red-400 shrink-0" />;
    }
};

const ErrorPlaceholder: React.FC<ErrorPlaceholderProps> = ({ title, error, onRetry, isRefetching = false, retryLabel = 'Retry', iconSize = 40, overlay = false, className }) => {
    return (
        <ShellLayout
            className={twMerge(
                'h-auto! w-full rounded border-red-100 p-4 shadow-none border-none overflow-auto',
                overlay ? 'absolute inset-0 z-10 bg-white/90 backdrop-blur-sm' : '',
                className,
            )}
        >
            <ShellLayout.Header className="flex-none flex flex-col items-center justify-center text-center gap-5.5 px-3 pt-3">
                {getErrorIcon((error?.cause as unknown as { originalError: Error | AxiosError })?.originalError ?? error, iconSize)}
                <p className="text-xs font-medium text-red-500">{title ?? getErrorTitle(error)}</p>
            </ShellLayout.Header>

            <ShellLayout.Body className="flex-none flex flex-col items-center justify-center gap-2 p-2">
                {error?.message && (
                    <div className="flex flex-wrap items-center gap-1.5 max-w-full max-h-18">
                        <p className="text-[11px] text-red-400/80">{error.message}</p>
                        <ErrorCauseRenderer error={error} copyOnly />
                    </div>
                )}
            </ShellLayout.Body>

            {onRetry && (
                <ShellLayout.Footer className="flex-none flex justify-center px-3 pb-3">
                    <button
                        type="button"
                        onClick={() => onRetry()}
                        disabled={isRefetching}
                        className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={11} className={isRefetching ? 'animate-spin' : ''} />
                        {isRefetching ? 'Retrying...' : retryLabel}
                    </button>
                </ShellLayout.Footer>
            )}
        </ShellLayout>
    );
};

export default ErrorPlaceholder;
