// Hook for component-level feature gating with licence.
import { useEffect, useState } from 'react';
import { verifyLicense } from '../utils/verify-license';
import type { LicensePayload } from '../types/license';
import isValidPayload from '../type-guards/is-valid-payload';
import logger from '@/shared/utils/logger';
import type { moduleIdMappings } from '../constants/module-id-mappings';
import dayjs from 'dayjs';

interface LicenseState {
    loading: boolean;
    valid: boolean;
    payload: LicensePayload | null;
}

export function useLicense() {
    const [state, setState] = useState<LicenseState>({
        loading: true,
        valid: false,
        payload: null,
    });

    useEffect(() => {
        let active = true;

        verifyLicense().then((result) => {
            if (!active) return;

            setState({
                loading: false,
                valid: result.valid,
                payload: (result.payload as LicensePayload) || null,
            });
        });

        return () => {
            active = false;
        };
    }, []);

    logger.debug('License state updated:', state);

    // Validate payload only if it exists
    if (!state.loading && (!state.valid || !state.payload || !isValidPayload(state.payload))) {
        throw new Error(`Invalid License`);
    }

    const exp = state.payload?.exp ? new Date(state.payload.exp * (state.payload.exp < 10000000000 ? 1000 : 1)) : null;
    const sub = state.payload?.sub || null;
    const customerName = state.payload?.customerName || null;
    const atkVersion = state.payload?.atkVersion || null;
    const sbu = state.payload?.sbu || null;
    const edl = state.payload?.edl || null;
    const pdl = state.payload?.pdl || null;
    const atkChampion = state.payload?.atkChampion || null;

    return {
        ...state,
        exp,
        expTimeStampStr: exp ? dayjs(exp).format('DD MMM YYYY, hh:mm:ss A') : '',
        sub,
        customerName,
        sbu,
        edl,
        pdl,
        atkChampion,
        atkVersion,
        customerCode: sub,
        hasModule: (moduleName: keyof typeof moduleIdMappings) => Boolean(state.payload?.modules?.[moduleName]),
        hasFeature: (featureName: string) => Boolean(state.payload?.features?.[featureName]),
    };
}
