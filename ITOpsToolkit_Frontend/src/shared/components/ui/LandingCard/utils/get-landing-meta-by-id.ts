import type { moduleIdMappings } from '@/license/constants/module-id-mappings';
import { moduleLandingCardsMeta } from '../contants/module-landing-cards-meta';

export function getLandingMetaById(id: string, canLoadLicensedModuleMeta?: (moduleName: keyof typeof moduleIdMappings) => boolean) {
    const moduleMeta = moduleLandingCardsMeta.find((meta) => meta.id === id);

    if (moduleMeta?.licensedModuleId && canLoadLicensedModuleMeta) {
        if (canLoadLicensedModuleMeta(moduleMeta?.licensedModuleId)) {
            return moduleMeta;
        } else {
            return undefined;
        }
    } else {
        return moduleMeta;
    }
}
