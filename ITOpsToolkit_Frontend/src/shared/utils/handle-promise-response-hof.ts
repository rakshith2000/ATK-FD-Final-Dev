import logger from './logger';

export function handlePromiseResponseHOF<T>(promiseFn: () => Promise<T>): Promise<T> {
    try {
        const result = promiseFn();
        return result;
    } catch (error) {
        logger.debug('Error in withPromiseResponseHandle:', error);
        throw error;
    }
}
