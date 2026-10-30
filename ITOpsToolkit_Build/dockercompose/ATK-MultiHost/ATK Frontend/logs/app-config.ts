import { z } from 'zod';
import { resolvePublicAssetPath } from '@/shared/utils/resolve-public-asset-path';

// Zod Validation Schemas
export const cosmoticsSchema = z.object({
    brandName: z.string().min(1, 'cosmotics.brandName is required'),
    enableViewingModeToggle: z.boolean(),
});

export const fasteaiSchema = z.object({
    baseUrl: z.string().min(1, 'fasteai.baseUrl is required'),
    sopBaseUrl: z.string().min(1, 'fasteai.sopBaseUrl is required'),
    logsBaseUrl: z.string().min(1, 'fasteai.logsBaseUrl is required'),
    sopGeneration: z.string().min(1, 'fasteai.sopGeneration is required'),
    coreWebsocket: z.string().min(1, 'fasteai.coreWebsocket is required'),
    schedulerBaseUrl: z.string().min(1, 'fasteai.schedulerBaseUrl is required'),
});

export const backendApiSchema = z
    .object({
        baseUrl: z.string().min(1, 'backend.api.baseUrl is required'),
        userSnowDetails: z.string().min(1),
        listKbCategories: z.string().min(1),
        listIssuesWithoutKbArticles: z.string().min(1),
        listRecentKbArticles: z.string().min(1),
        refineKbArticle: z.string().min(1),
        generateKbArticle: z.string().min(1),
        mergeKbArticles: z.string().min(1),
        listDuplicateKnowledgeArticles: z.string().min(1),
        createKnowledgeArticle: z.string().min(1),
        updateKnowledgeArticle: z.string().min(1),
        listKnowledgeArticles: z.string().min(1),
        kbAiScoreByContent: z.string().min(1),
        kbAiScoreByNumber: z.string().min(1),
        listRelevantArticles: z.string().min(1),
        generateResolutionNotes: z.string().min(1),
        draftChange: z.string().min(1),
        uploadDraftImage: z.string().min(1),
        pushChangeRequestToItsm: z.string().min(1),
        listAllQuizzes: z.string().min(1),
        chatBot: z.string().min(1),
        getToolkitPackageConfig: z.string().min(1),
        updateToolkitPackageConfig: z.string().min(1),
        updateModuleConfiguration: z.string().min(1),
        onboardModuleConfiguration: z.string().min(1),
        getModuleConfigs: z.string().min(1),
        updateAgentDefination: z.string().min(1),
        listLLMs: z.string().min(1),
        listLLMsWithConfig: z.string().min(1),
        onboardLLM: z.string().min(1),
        getLLMConfig: z.string().min(1),
        deleteLLM: z.string().min(1),
        listLiteLLMProxies: z.string().min(1),
        onboardLiteLLMProxy: z.string().min(1),
        deleteLiteLLMProxy: z.string().min(1),
        listITSMConnectors: z.string().min(1),
        onboardITSMConnector: z.string().min(1),
        deleteITSMConnector: z.string().min(1),
        getITSMConnectorConfig: z.string().min(1),
        uploadVaultConfig: z.string().min(1),
        meeting_by_grp_partcipants: z.string().min(1),
        meeting_onboard: z.string().min(1),
        meeting_convert_to_html: z.string().min(1),
        meeting_details_by_meeting_id: z.string().min(1),
        meeting_update_group: z.string().min(1),
        meeting_archived_articles: z.string().min(1),
        meeting_chat: z.string().min(1),
        meeting_get_auth_details: z.string().min(1),
        meeting_delete: z.string().min(1),
        meeting_start_refresh: z.string().min(1),
        meeting_transcript: z.string().min(1),
        problem_list_tickets: z.string().min(1),
        problem_assignment_groups: z.string().min(1),
        problem_state_choices: z.string().min(1),
        problem_group_members: z.string().min(1),
        problem_push_to_itsm: z.string().min(1),
        problem_update_details: z.string().min(1),
        generateMcqs: z.string().min(1),
        getMcqs: z.string().min(1),
        submitQuiz: z.string().min(1),
        listQuestionsWithIncorrectResponses: z.string().min(1),
        generateScenarios: z.string().min(1),
        listQuizzes: z.string().min(1),
        listQuizzesForUser: z.string().min(1),
        get_mim_details: z.string().min(1),
        upload_shift_roaster: z.string().min(1),
        download_roaster_file: z.string().min(1),
        update_form_configuration: z.string().min(1),
        create_form_configuration: z.string().min(1),
        get_form_configuration: z.string().min(1),
        delete_form_configuration: z.string().min(1),
    })
    .passthrough();

export const serviceNowApiSchema = z
    .object({
        baseUrl: z.string().min(1, 'serviceNow.api.baseUrl is required'),
        userDetails: z.string().min(1),
        userMemberOfAssignmentGroupsByUserSysId: z.string().min(1),
        assignmentGroups: z.string().min(1),
        incidentTable: z.string().min(1),
        knowledgeTable: z.string().min(1),
        problemTable: z.string().min(1),
        scRequestTable: z.string().min(1),
        sysChoiceTable: z.string().min(1),
        ticketsAssignedByUserSysId: z.string().min(1),
        ticketsAssignedByGroupQuery: z.string().min(1),
        ticketsUnassignedByTicketType: z.string().min(1),
        ticketStateChoiceByTicketType: z.string().min(1),
        ticketRequestStateChoiceByTicketType: z.string().min(1),
        ticketJournalEntriesTypeTicketSysId: z.string().min(1),
        ticketAuditEntriesTypeTicketSysId: z.string().min(1),
        ticketRelatedIncidentsByTicketCmdbCiId: z.string().min(1),
        ticketRelatedChangesByTicketCmdbCiId: z.string().min(1),
        ticketRelatedAlertsByTicketSysId: z.string().min(1),
        groupMembersByGroupSysId: z.string().min(1),
        searchCmdbCi: z.string().min(1),
        patchTicketBySysId: z.string().min(1),
        ticketRelatedProblemsByTicketCmdbCiId: z.string().min(1),
        ticketRelatedProblemAlertsByTicketSysId: z.string().min(1),
        userRelatedRequestsByUserSysId: z.string().min(1),
        relatedRequestsByShortDescription: z.string().min(1),
        knowledgeUserCriteria: z.string().min(1),
        knowledgeBaseReadAccess: z.string().min(1),
        knowledgeArticles: z.string().min(1),
        ticketAttachments: z.string().min(1),
        ticketDownloadAttachment: z.string().min(1),
        ticketUploadAttachment: z.string().min(1),
        ticketRelatedIncidentByTicketSysId: z.string().min(1),
        submitChangeRequest: z.string().min(1),
        taskSlaTable: z.string().min(1),
    })
    .passthrough();

export const keycloakConfigSchema = z.object({
    url: z.string().min(1, 'Keycloak url is required'),
    realm: z.string().min(1, 'Keycloak realm is required'),
    clientId: z.string().min(1, 'Keycloak clientId is required'),
    identityProvider: z.enum(['keycloak', 'others'] as const),
    identityProviderAlias: z.string(),
    redirectUri: z.string().min(1, 'Keycloak redirectUri is required'),
    postLogoutRedirectUri: z.string().min(1, 'Keycloak postLogoutRedirectUri is required'),
});

export const entraIdScopesSchema = z
    .object({
        'ms-graph': z.array(z.string().min(1, 'Scope cannot be empty')).default(['User.Read']),
        serviceNow: z.array(z.string().min(1, 'Scope cannot be empty')).default([]),
        backend: z.array(z.string().min(1, 'Scope cannot be empty')).default([]),
    })
    .transform((scopes) => ({
        ...scopes,
        default: Array.from(new Set([...scopes['ms-graph'], ...scopes.serviceNow, ...scopes.backend])),
    }));

export const entraIdConfigSchema = z.object({
    clientId: z.string().min(1, 'Entra ID clientId is required'),
    authority: z.string().min(1, 'Entra ID authority is required'),
    scopes: entraIdScopesSchema,
    redirectUri: z.string().min(1, 'Entra ID redirectUri is required'),
    postLogoutRedirectUri: z.string().min(1, 'Entra ID postLogoutRedirectUri is required'),
});

export const authConfigSchema = z
    .object({
        MAX_TOKEN_REFRESH_RETRIES: z.number().default(20),
        provider: z
            .preprocess((val) => (val === 'entraId' ? 'entra-id' : val), z.enum(['keycloak', 'entra-id']))
            .optional()
            .default('keycloak'),
        entraId: entraIdConfigSchema.optional(),
        keycloak: keycloakConfigSchema.optional(),
    })
    .superRefine((auth, ctx) => {
        if (auth.provider === 'keycloak' && !auth.keycloak) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'auth.keycloak object is required when auth.provider is "keycloak"',
                path: ['keycloak'],
            });
        }
        if (auth.provider === 'entra-id' && !auth.entraId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'auth.entraId object is required when auth.provider is "entra-id"',
                path: ['entraId'],
            });
        }
    });

export const accessControlSchema = z.object({
    pages: z.object({
        gbac: z.object({
            admin: z.string().min(1),
        }),
    }),
    features: z.object({
        gbac: z.object({
            mimAiPromptLibrary: z.string().min(1),
            problemAiPromptLibrary: z.string().min(1),
            changeAiPromptLibrary: z.string().min(1),
            trainAiPromptLibrary: z.string().min(1),
            knowledgeAiPromptLibrary: z.string().min(1),
            meetingAiPromptLibrary: z.string().min(1),
            incidentAiPromptLibrary: z.string().min(1),
            adminPromptLibrary: z.string().min(1),
            adminItsmConnectors: z.string().min(1),
            adminLlmModels: z.string().min(1),
            adminLiteLLMProxy: z.string().min(1),
            adminAgentGateWay: z.string().min(1),
            adminVault: z.string().min(1),
            adminFormManagement: z.string().min(1),
            adminSsoClient: z.string().min(1),
        }),
    }),
});

export const externalLinksSchema = z.object({
    cloudAi: z.string().min(1),
    ticketAudit: z.string().min(1),
    callAudit: z.string().min(1),
    atkPulse: z.string().min(1),
});

export const iframesSchema = z.object({
    agentGateway: z.string().min(1),
});

export const hybridFormsSchema = z.object({
    enableIncidentForm: z.boolean(),
});

export const appConfigSchema = z.object({
    cosmotics: cosmoticsSchema,
    isInDemoEnvironment: z.boolean(),
    demoEnvironmentActionMessage: z.string(),
    backend: z.object({
        api: backendApiSchema,
    }),
    serviceNow: z.object({
        api: serviceNowApiSchema,
    }),
    fasteai: fasteaiSchema,
    userServiceNowUserIDKeyInAuth: z.string().min(1),
    servicenowSysUserQueryKey: z.string().min(1),
    auth: authConfigSchema,
    accessControl: accessControlSchema,
    externalLinks: externalLinksSchema,
    iframes: iframesSchema,
    hybridForms: hybridFormsSchema,
});

// Inferred TypeScript Types (Single Source of Truth from Zod)
export type KeycloakConfig = z.infer<typeof keycloakConfigSchema>;
export type EntraIdScopes = z.infer<typeof entraIdScopesSchema>;
export type EntraIdConfig = z.infer<typeof entraIdConfigSchema>;
export type AuthConfig = z.infer<typeof authConfigSchema>;
export type AppConfig = z.infer<typeof appConfigSchema>;

// Runtime Configuration Loader & State
let _appConfig: AppConfig | null = null;

/**
 * Validates the loaded config object against the Zod appConfigSchema.
 * Returns an array of error messages, or an empty array if valid.
 */
export function validateAppConfig(config: unknown): string[] {
    const result = appConfigSchema.safeParse(config);
    if (result.success) {
        return [];
    }
    return result.error.issues.map((issue) => {
        const path = issue.path.join('.');
        return `${path ? `${path}: ` : ''}${issue.message}`;
    });
}

/**
 * Loads and validates /app-config.json at application bootstrap time.
 */
export async function loadAppConfig(): Promise<AppConfig> {
    const response = await fetch(resolvePublicAssetPath('/app-config.json'));
    if (!response.ok) {
        throw new Error(`Failed to load app-config.json: ${response.status} ${response.statusText}`);
    }
    const rawJson = await response.json();

    const parseResult = appConfigSchema.safeParse(rawJson);
    if (!parseResult.success) {
        const errors = parseResult.error.issues.map((issue) => {
            const path = issue.path.join('.');
            return `${path ? `${path}: ` : ''}${issue.message}`;
        });
        throw new Error(`Invalid app-config.json:\n${errors.join('\n')}`);
    }

    const validatedConfig = parseResult.data;

    _appConfig = validatedConfig;
    return _appConfig;
}

/**
 * Proxied runtime accessor for AppConfig.
 * Throws a descriptive error if accessed before loadAppConfig() resolves.
 */
export const appConfig: AppConfig = new Proxy({} as AppConfig, {
    get(_target, prop, receiver) {
        if (_appConfig === null) {
            throw new Error('appConfig accessed before loadAppConfig() was called. Ensure loadAppConfig() is awaited in main.tsx before rendering.');
        }
        return Reflect.get(_appConfig, prop, receiver);
    },

    ownKeys(_target) {
        if (_appConfig === null) {
            throw new Error('appConfig accessed before loadAppConfig() was called. Ensure loadAppConfig() is awaited in main.tsx before rendering.');
        }
        return Reflect.ownKeys(_appConfig);
    },
});
