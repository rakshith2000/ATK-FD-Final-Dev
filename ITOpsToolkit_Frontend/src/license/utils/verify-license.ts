import { importSPKI, jwtVerify } from 'jose';
import { LICENSE_PUBLIC_KEY } from '../public-key';
import { loadAppLicense } from '../load-app-license';
import type { LicensePayload } from '../types/license';
import isValidPayload from '../type-guards/is-valid-payload';

const ALG = 'RS256';

let cachedResult: { valid: true; payload: LicensePayload } | { valid: false; payload: null } | null = null;

export async function verifyLicense() {
    if (cachedResult) return cachedResult;

    try {
        const LICENSE_TOKEN: string = await loadAppLicense();

        const publicKey = await importSPKI(LICENSE_PUBLIC_KEY, ALG);

        const { payload } = await jwtVerify(LICENSE_TOKEN, publicKey);

        // Validate payload before caching
        if (isValidPayload(payload)) {
            cachedResult = { valid: true, payload: payload as LicensePayload };
        } else {
            cachedResult = { valid: false, payload: null };
        }

        return cachedResult;
    } catch {
        cachedResult = { valid: false, payload: null };
        return cachedResult;
    }
}
