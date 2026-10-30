import type { z } from 'zod';
import type {
    MimDetailsRequestSchema,
    MimConversationMessageSchema,
    MimIncidentDetailsSchema,
    MimMeetingDetailsSchema,
    MimDataResponseSchema,
} from '../schemas/mim-details.schemas';

// Inferred TypeScript Types from Zod Schemas
export type GetMimDetailsRequest = z.infer<typeof MimDetailsRequestSchema>;
export type MimConversationMessage = z.infer<typeof MimConversationMessageSchema>;
export type MimIncidentDetails = z.infer<typeof MimIncidentDetailsSchema>;
export type MimMeetingDetails = z.infer<typeof MimMeetingDetailsSchema>;
export type MimDataResponse = z.infer<typeof MimDataResponseSchema>;
