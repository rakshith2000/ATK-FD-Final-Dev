import type { LicensePayload } from '../types/license';

export default function isVaildPayload(obj: unknown): obj is LicensePayload {
    if (typeof obj !== 'object' || obj === null) return false;

    const licensePayload = obj as Record<string, unknown>;

    return (
        typeof licensePayload.iss === 'string' &&
        typeof licensePayload.aud === 'string' &&
        typeof licensePayload.sub === 'string' &&
        typeof licensePayload.licenseId === 'string' &&
        typeof licensePayload.product === 'string' &&
        typeof licensePayload.edition === 'string' &&
        typeof licensePayload.ver === 'number' &&
        typeof licensePayload.customerName === 'string' &&
        typeof licensePayload.atkVersion === 'number' &&
        typeof licensePayload.sbu === 'string' &&
        typeof licensePayload.edl === 'string' &&
        typeof licensePayload.pdl === 'string' &&
        typeof licensePayload.atkChampion === 'string' &&
        (licensePayload.exp === undefined || typeof licensePayload.exp === 'number') &&
        typeof licensePayload.modules === 'object' &&
        licensePayload.modules !== null &&
        Object.values(licensePayload.modules as Record<string, unknown>).every((val) => typeof val === 'boolean') &&
        typeof licensePayload.features === 'object' &&
        licensePayload.features !== null &&
        Object.values(licensePayload.features as Record<string, unknown>).every((val) => typeof val === 'boolean')
    );
}
