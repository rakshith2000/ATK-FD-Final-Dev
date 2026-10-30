function unknownErrorToMessage(error: unknown): string {
    if (!error) return 'An unknown error occurred';

    if (typeof error === 'string') return error;

    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message;
    }

    return 'An unknown error occurred';
}

export default unknownErrorToMessage;
