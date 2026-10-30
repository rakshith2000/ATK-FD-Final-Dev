import type { SnowKBReadAccessRecord, SnowUserCriteriaRecord } from '../types/access';
import { isSnowFieldWithReferenceLink } from './index.guards';

export function isSnowUserCriteriaRecord(obj: unknown): obj is SnowUserCriteriaRecord {
    if (typeof obj !== 'object' || obj === null) return false;
    const record = obj as Record<string, unknown>;
    return typeof record.sys_id === 'string' && (record.name === undefined || typeof record.name === 'string');
}

export function isSnowUserCriteriaArray(obj: unknown): obj is SnowUserCriteriaRecord[] {
    return Array.isArray(obj) && obj.every(isSnowUserCriteriaRecord);
}

export function isSnowKBReadAccessRecord(obj: unknown): obj is SnowKBReadAccessRecord {
    if (typeof obj !== 'object' || obj === null) return false;
    const record = obj as Record<string, unknown>;
    return isSnowFieldWithReferenceLink(record.kb_knowledge_base) && isSnowFieldWithReferenceLink(record.user_criteria);
}
