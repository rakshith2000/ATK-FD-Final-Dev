import { z } from 'zod';

export const ITSMConnectorSchema = z.object({
    itsm_tag: z.string(),
    itsm_type: z.string(),
    updated_by: z.string(),
});

export const ITSMConnectorsListResponseSchema = z.array(ITSMConnectorSchema);

export const ITSMConnectorConfigSchema = z.object({
    itsm_tag: z.string().min(1),
    itsm_type: z.string().min(1),
    itsm_auth_type: z.string().min(1),
    itsm_url: z.string().min(1),

    itsm_user: z.string().optional(),
    itsm_password: z.string().optional(),
    bearer_token: z.string().optional(),

    itsm_additional_config: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const GetITSMConnectorConfigRequestSchema = z.object({
    itsm_tag: z.string(),
});

export const OnboardITSMConnectorResponseSchema = z.object({
    message: z.string(),
});

export const DeleteITSMConnectorRequestSchema = z.object({
    itsm_tag: z.string(),
});

export const DeleteITSMConnectorResponseSchema = z.object({
    message: z.string(),
});
