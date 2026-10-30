import type { moduleIdMappings } from '../constants/module-id-mappings';
import { verifyLicense } from './verify-license';
import { type ParsedLocation } from '@tanstack/react-router';

export async function requireLicensedModule(module: keyof typeof moduleIdMappings, location: ParsedLocation) {
    const license = await verifyLicense();

    if (!license.valid || !license.payload?.modules?.[module]) {
        throw new Error('Access Denied, This page or feature you are trying to access not licensed for your account..', {
            cause: {
                module,
                location,
            },
        });
    }
}
