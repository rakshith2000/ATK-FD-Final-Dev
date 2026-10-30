import { useRouter } from '@tanstack/react-router';
import React from 'react';
import { AlertTriangle, Home, ArrowLeft, RotateCcw } from 'lucide-react';
import { appEnvConfig } from '@/config/app-env-config';
import { ErrorCauseRenderer } from '../ErrorCauseRenderer/ErrorCauseRenderer';

export interface ErrorBoundaryFallbackProps {
    title?: string;
    message?: string;
    description?: string;
    icon?: React.ReactNode;
    showHomeButton?: boolean;
    showBackButton?: boolean;
    error?: Error;
    reset?: () => void;
}

const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({
    title = 'Something went wrong',
    message = 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    icon = <AlertTriangle className="text-red-500" size={32} />,
    showHomeButton = true,
    showBackButton = true,
    error,
    description,
    reset,
}) => {
    const router = useRouter();

    return (
        <div className="flex items-center justify-center p-4 overflow-hidden">
            <div className="w-full max-w-[90dvw] max-h-[80dvh] flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm overflow-auto">
                <div className="flex items-center justify-center size-12 rounded-full bg-red-50">{icon}</div>
                <h2 className="text-sm font-semibold text-gray-900 text-center shrink-0">{title}</h2>
                <p className="text-xs text-gray-500 text-center leading-relaxed shrink-0">{message}</p>

                <div className="w-full min-h-0 overflow-y-auto flex flex-col gap-3">
                    {appEnvConfig.isInDevelopmentMode && description && (
                        <div className="w-full rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                            <p className="text-[11px] text-red-600 whitespace-pre-wrap wrap-break-word leading-relaxed">{description}</p>
                        </div>
                    )}

                    <div className="w-full">
                        <ErrorCauseRenderer error={error} />
                    </div>
                </div>

                <div className="flex items-center gap-2 pt-1 shrink-0">
                    {showHomeButton && (
                        <button
                            onClick={() => router.navigate({ to: '/', viewTransition: true })}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                        >
                            <Home size={13} />
                            Home
                        </button>
                    )}
                    {showBackButton && (
                        <button
                            onClick={() => router.history.back()}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                        >
                            <ArrowLeft size={13} />
                            Go Back
                        </button>
                    )}
                    {reset && (
                        <button
                            onClick={reset}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                        >
                            <RotateCcw size={13} />
                            Retry
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ErrorBoundaryFallback;
