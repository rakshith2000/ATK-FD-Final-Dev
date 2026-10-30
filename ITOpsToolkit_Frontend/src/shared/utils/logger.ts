import { appEnvConfig } from '@/config/app-env-config';

const LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
} as const;

type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

class Logger {
    private currentLevel: LogLevel;

    constructor(level: LogLevel = LogLevel.INFO) {
        this.currentLevel = level;
    }

    private formatPrefix(level: string) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level}]`;
    }

    error(...args: Array<unknown>) {
        if (this.currentLevel >= LogLevel.ERROR) {
            // eslint-disable-next-line no-console
            console.error(this.formatPrefix('ERROR'), ...args);
        }
    }

    warn(...args: Array<unknown>) {
        if (this.currentLevel >= LogLevel.WARN) {
            // eslint-disable-next-line no-console
            console.warn(this.formatPrefix('WARN'), ...args);
        }
    }

    info(...args: Array<unknown>) {
        if (this.currentLevel >= LogLevel.INFO) {
            // eslint-disable-next-line no-console
            console.info(this.formatPrefix('INFO'), ...args);
        }
    }

    debug(...args: Array<unknown>) {
        // Log debug in both dev and prod if level allows
        if (this.currentLevel >= LogLevel.DEBUG) {
            // eslint-disable-next-line no-console
            console.debug(this.formatPrefix('DEBUG'), ...args);
        }
    }

    group(label: string, callback: () => void) {
        if (appEnvConfig.isInDevelopmentMode || this.currentLevel >= LogLevel.DEBUG) {
            // eslint-disable-next-line no-console
            console.group(this.formatPrefix('GROUP') + ' ' + label);
            try {
                callback();
            } finally {
                // eslint-disable-next-line no-console
                console.groupEnd();
            }
        }
    }

    table(data: unknown) {
        if (appEnvConfig.isInDevelopmentMode || this.currentLevel >= LogLevel.DEBUG) {
            // eslint-disable-next-line no-console
            console.table(data);
        }
    }

    setLevel(level: keyof typeof LogLevel) {
        this.currentLevel = LogLevel[level];
    }
}

// Default logger instance with level based on environment
const logger = new Logger(appEnvConfig.isInDevelopmentMode ? LogLevel.DEBUG : LogLevel.WARN);

export default logger;
