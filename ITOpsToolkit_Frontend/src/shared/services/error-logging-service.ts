import logger from '@/shared/utils/logger';
import unknownErrorToMessage from '@/shared/utils/unknown-error-to-message';

export type ErrorSource = 'react:caught' | 'react:uncaught' | 'react:recoverable' | 'async' | 'unhandledrejection' | 'global';

export interface ErrorLogEntry {
    source: ErrorSource;
    message: string;
    error: unknown;
    componentStack?: string;
    timestamp: string;
}

type ErrorLogTransport = (entry: ErrorLogEntry) => void | Promise<void>;

class ErrorLoggingService {
    private transports: ErrorLogTransport[] = [];

    addTransport(transport: ErrorLogTransport) {
        this.transports.push(transport);
    }

    removeTransport(transport: ErrorLogTransport) {
        this.transports = this.transports.filter((t) => t !== transport);
    }

    report(source: ErrorSource, error: unknown, componentStack?: string) {
        const entry: ErrorLogEntry = {
            source,
            message: unknownErrorToMessage(error),
            error,
            componentStack,
            timestamp: new Date().toISOString(),
        };

        if (source === 'react:uncaught' || source === 'unhandledrejection' || source === 'global') {
            logger.error(`[${source}]`, entry.message, error);
        } else {
            logger.warn(`[${source}]`, entry.message, error);
        }

        for (const transport of this.transports) {
            try {
                transport(entry);
            } catch (transportError) {
                logger.error('[ErrorLoggingService] Transport failed', transportError);
            }
        }
    }

    onCaughtError = (error: unknown, errorInfo: React.ErrorInfo) => {
        this.report('react:caught', error, errorInfo?.componentStack ?? undefined);
    };

    onUncaughtError = (error: unknown, errorInfo: React.ErrorInfo) => {
        this.report('react:uncaught', error, errorInfo?.componentStack ?? undefined);
    };

    onRecoverableError = (error: unknown, errorInfo: React.ErrorInfo) => {
        this.report('react:recoverable', error, errorInfo?.componentStack ?? undefined);
    };
}

const errorLoggingService = new ErrorLoggingService();

export default errorLoggingService;
