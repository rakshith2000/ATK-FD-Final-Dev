import type { AuthProviderType } from '@/shared/modules/auth/types/auth';

export const appConfig = {
    cosmotics: {
        brandName: 'Cognizant',
        enableViewingModeToggle: false,
    },
    isInDemoEnvironment: false,
    demoEnvironmentActionMessage: "Demo Environment Info: The Action doesn't Porpagated to Backend since we are in demo",
    backend: {
        api: {
            baseUrl: 'https://<DNS Name>/api',
            userSnowDetails: '/incident_management/api/v1/get_user_details/',
            kbCategories: '/kb_management/api/v1/get_kb_categories/',
            contextualResponse: '/kb_management/api/v1/get_contextual_response/',
            duplicateKnowledgeArticles: '/kb_management/api/v1/find_duplicate_knowledge_articles/',
            incidentsWithoutKbArticles: '/kb_management/api/v1/get_incs_without_kbs/',
            recentKbArticles: '/kb_management/api/v1/get_recent_kbs/',
            retriveKnowledgeArticles: '/kb_management/api/v1/retrieve_knowledge_articles/',
            refineKbArticles: '/kb_management/api/v1/refine_kb_articles/',
            createKnowledgeArticle: '/kb_management/api/v1/create_knowledge_article/',
            updateKnowledgeArticle: '/kb_management/api/v1/update_knowledge_article/',
            mergeArticles: '/kb_management/api/v1/merge_kb_articles/',
            chatMessage: '/resolution_management/api/v1/act_for_demo_on_ask',
            // Admin portal //
            // Prompt Library
            getToolkitPackageConfig: '/admin/api/v1/get_toolkit_package_config/', // POST
            updateToolkitPackageConfig: '/admin/api/v1/update_toolkit_package_global_config', // POST
            updateAgentDefination: '/admin/api/v1/update_agent_definition', // POST
            // LLM Models Configurations
            listLLMs: '/admin/api/v1/list_llms/', // GET
            listLLMsWithConfig: '/admin/api/v1/get_llm_config/all', // GET
            onboardLLM: '/admin/api/v1/onboard_llm/', // POST
            getLLMConfig: '/admin/api/v1/get_llm_config/', // POST
            deleteLLM: '/admin/api/v1/delete_llm/', // POST
            // Lite LLM Proxy Configurations
            listLiteLLMProxies: '/admin/api/v1/get_litellm_proxy_config/', // GET
            onboardLiteLLMProxy: '/admin/api/v1/onboard_litellm_proxy/', // POST
            deleteLiteLLMProxy: '/admin/api/v1/delete_litellm_proxy/', // POST
            // ITSM Connectors
            listITSMConnectors: '/admin/api/v1/list_itsm_connectors/', // GET
            onboardITSMConnector: '/admin/api/v1/onboard_itsm_connector/', // POST
            deleteITSMConnector: '/admin/api/v1/delete_itsm_connector/', // POST
            getITSMConnectorConfig: '/admin/api/v1/get_itsm_connector_config/', // POST
            // Vault Config
            uploadVaultConfig: '/admin/api/v1/upload_vault_config', // POST Multipart/form-data
        },
    },
    serviceNow: {
        api: {
            baseUrl: '<ServiceNow Instance URL>',
            userMemberOfAssignmentGroupsByUserSysId:
                '/api/now/table/sys_user_grmember?sysparm_fields=group&sysparm_display_value=all&sysparm_query=user%3D<USER_SYS_ID_PLACEHOLDER>',
            assignmentGroups: '/api/now/table/sys_user_group?sysparm_fields=name,sys_id',
            ticketsAssignedByUserSysId:
                '/api/now/table/<TICKET_TYPE_PLACEHOLDER>?sysparm_query=assigned_to%3D<USER_SYS_ID_PLACEHOLDER>%5EstateNOT%20IN6%2C7&sysparm_display_value=all',
            ticketsAssignedByGroupQuery:
                '/api/now/table/<TICKET_TYPE_PLACEHOLDER>?sysparm_query=assignment_group%3D<GROUP_QUERY>NQstate!%3D6%5E7%5E8&sysparm_display_value=all&sysparm_limit=20',
            ticketsUnassignedByTicketType:
                '/api/now/table/<TICKET_TYPE_PLACEHOLDER>?sysparm_query=assigned_toISEMPTY%5EstateNOT%20IN6%2C7%2C3&sysparm_limit=15&sysparm_display_value=all',
            ticketStateChoiceByTicketType: '/api/now/table/sys_choice?sysparm_query=name=<TICKET_TYPE_PLACEHOLDER>^element=state&sysparm_fields=label,value,sys_id',
            ticketJournalEntriesTypeTicketSysId:
                '/api/now/table/sys_journal_field?sysparm_query=element_id=<TICKET_SYS_ID_PLACEHOLDER>%5EelementINwork_notes,comments&sysparm_fields=element,value,sys_created_by,sys_created_on&sysparm_order_by=sys_created_on',
            ticketRelatedIncidentsByTicketCmdbCiId:
                '/api/now/table/incident?sysparm_query=cmdb_ci%3D<CMDB_CI_ID_PLACEHOLDER>%5EORDERBYDESCsys_created_on&sysparm_limit=5&sysparm_display_value=all&sysparm_fields=number,short_description,state,severity,opened_at,sys_id,priority',
            ticketRelatedChangesByTicketCmdbCiId:
                '/api/now/table/change_request?sysparm_query=cmdb_ci%3D<CMDB_CI_ID_PLACEHOLDER>%5EORDERBYDESCsys_created_on&sysparm_limit=5&sysparm_display_value=all&sysparm_fields=number,short_description,state,severity,opened_at,sys_id,priority',
            ticketRelatedAlertsByTicketSysId:
                '/api/now/table/em_alert?sysparm_query=incident%3D<SYS_ID_PLACEHOLDER>&sysparm_fields=number,short_description,state,severity,priority,opened_at,source,sys_id&sysparm_display_value=all&sysparm_limit=3',
            groupMembersByGroupSysId: '/api/now/table/sys_user_grmember?sysparm_display_value=all&sysparm_fields=user,sys_id&sysparm_query=group=<GROUP_SYS_ID_PLACEHOLDER>',
            patchTicketBySysId: 'api/now/table/<TICKET_TYPE_PLACEHOLDER>/<SYS_ID_PLACEHOLDER>?sysparm_display_value=all',
        },
    },
    userServiceNowUniqueIdKeyName: 'preferred_username',
    auth: {
        provider: 'keycloak' as AuthProviderType,
        entraId: {
            clientId: '<Entra ID Application Client ID>',
            authority: 'https://login.microsoftonline.com/<Entra ID Tenant ID>',
            redirectUri: 'http://localhost:3000/',
            postLogoutRedirectUri: 'http://localhost:3000/',
        },
        keycloak: {
            url: 'https://<DNS Name>/auth/',
            realm: '<Keycloak Realm Name>',
            clientId: '<Admin Frontend Keycloak Client ID>',
            redirectUri: window.location.href,
            postLogoutRedirectUri: window.location.href,
        },
    },
    accessControl: {
        pages: {
            gbac: {
                admin: '/Admin',
            },
        },
        features: {
            gbac: {
                changeAiPromptLibrary: '/Admin/Prompt_Library/change_assist',
                trainAiPromptLibrary: '/Admin/Prompt_Library/train_assist',
                knowledgeAiPromptLibrary: '/Admin/Prompt_Library/knowledge_assist',
                meetingAiPromptLibrary: '/Admin/Prompt_Library/meeting_assist',
                incidentAiPromptLibrary: '/Admin/Prompt_Library/incident_assist',
                adminPromptLibrary: '/Admin/Prompt_Library',
                adminItsmConnectors: '/Admin/ITSM_Connectors',
                adminLlmModels: '/Admin/LLM_Models',
                adminLiteLLMProxy: '/Admin/Lite_LLM_Proxy',
                adminAgentGateWay: '/Admin/Agent_Gateway',
                adminVault: '/Admin/Vault',
                adminFormManagement: '/Admin/Form_Management',
                adminSsoClient: '/Admin/SSO',
            },
        },
    },
};
