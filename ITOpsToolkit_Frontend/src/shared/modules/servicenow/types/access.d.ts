import type { SnowFieldWithReferenceLink } from '.';

export interface SnowUserCriteriaRecord {
    sys_id: string;
    name?: string;
}

export interface SnowKBReadAccessRecord {
    kb_knowledge_base: SnowFieldWithReferenceLink;
    user_criteria: SnowFieldWithReferenceLink;
}
