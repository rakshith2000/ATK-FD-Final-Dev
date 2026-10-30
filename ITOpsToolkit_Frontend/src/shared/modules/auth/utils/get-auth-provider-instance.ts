import type { IAuthProvider } from '../types/auth';
import { createAuthProvider } from '../auth-provider-factory';

let _instance: IAuthProvider | null = null;

export const getAuthProviderInstance = (): IAuthProvider => {
    if (!_instance) {
        _instance = createAuthProvider();
    }
    return _instance;
};

export const setAuthProviderInstance = (provider: IAuthProvider): void => {
    _instance = provider;
};
