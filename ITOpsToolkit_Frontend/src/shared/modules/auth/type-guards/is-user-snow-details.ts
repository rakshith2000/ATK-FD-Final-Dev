import type { UserSnowDetails } from '../types/auth';

export function isUserSnowDetails(value: unknown): value is UserSnowDetails {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const obj = value as Record<string, unknown>;

    return typeof obj.sys_id === 'string' && typeof obj.user_name === 'string' && typeof obj.name === 'string' && typeof obj.email === 'string';
}
