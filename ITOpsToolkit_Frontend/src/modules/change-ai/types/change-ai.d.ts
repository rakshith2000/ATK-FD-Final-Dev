import type { z } from 'zod';

import type { DraftChangeRequestSchema, ChangeDetailsSchema, DraftChangeResponseSchema, PushChangesResponseSchema } from '../schemas/change-ai.schemas';

export type DraftChangeRequest = z.infer<typeof DraftChangeRequestSchema>;

export type ChangeDetails = z.infer<typeof ChangeDetailsSchema>;

export type DraftChangeResponse = z.infer<typeof DraftChangeResponseSchema>;
export interface PushChangesRequest {
    cmdb_ci: string;
    short_description: string;
    description: string;
    implementation_plan: string;
    backout_plan: string;
    test_plan: string;
    start_date?: string;
    end_date?: string;
    chg_model: string;
    risk_impact_analysis: string;
    attachments: string[];
}

export type PushChangesResponse = z.infer<typeof PushChangesResponseSchema>;
