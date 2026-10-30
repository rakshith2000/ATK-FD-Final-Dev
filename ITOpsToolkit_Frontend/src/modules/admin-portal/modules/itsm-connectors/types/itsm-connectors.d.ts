import type { z } from 'zod';
import type {
    ITSMConnectorSchema,
    ITSMConnectorsListResponseSchema,
    ITSMConnectorConfigSchema,
    GetITSMConnectorConfigRequestSchema,
    OnboardITSMConnectorResponseSchema,
    DeleteITSMConnectorRequestSchema,
    DeleteITSMConnectorResponseSchema,
} from '../schemas/itsm-connectors.schemas';

export type ITSMConnector = z.infer<typeof ITSMConnectorSchema>;

export type ITSMConnectorsListResponse = z.infer<typeof ITSMConnectorsListResponseSchema>;

export type ITSMConnectorConfig = z.infer<typeof ITSMConnectorConfigSchema>;

export type GetITSMConnectorConfigRequest = z.infer<typeof GetITSMConnectorConfigRequestSchema>;

export type OnboardITSMConnectorRequest = ITSMConnectorConfig;

export type OnboardITSMConnectorResponse = z.infer<typeof OnboardITSMConnectorResponseSchema>;

export type DeleteITSMConnectorRequest = z.infer<typeof DeleteITSMConnectorRequestSchema>;

export type DeleteITSMConnectorResponse = z.infer<typeof DeleteITSMConnectorResponseSchema>;
