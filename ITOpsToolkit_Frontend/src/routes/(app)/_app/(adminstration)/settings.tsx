import { appConfig } from '@/config/app-config';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import TabButton from '@/modules/admin-portal/components/ui/TabButton/TabButton';
import { useScrollOverflow } from '@/shared/hooks/useScrollOverflow';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import UnAuthorisedAccess from '@/shared/components/ui/UnAuthorisedAccess/UnAuthorisedAccess';
import UnAuthorisedAccessError from '@/shared/utils/errors/UnAuthorisedAccessError';
import { createFileRoute, Outlet, useNavigate, useMatchRoute } from '@tanstack/react-router';
import { type ReactNode } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { twMerge } from 'tailwind-merge';
import { requireLicensedModule } from '@/license/utils/requireLicensedModule';
import { moduleIdMappings } from '@/license/constants/module-id-mappings';

interface AdminTab {
    key: string;
    displayName: string;
    icon?: ReactNode;
    accessControlGroup: string;
    path: string;
}

const getAvailableTabs = (): AdminTab[] => [
    { key: 'prompt-library', displayName: 'Prompt Library', accessControlGroup: appConfig.accessControl.features.gbac.adminPromptLibrary, path: '/settings/prompt-library' },
    { key: 'llm-models', displayName: 'LLM Models', accessControlGroup: appConfig.accessControl.features.gbac.adminLlmModels, path: '/settings/llm-models' },
    { key: 'lite-llm-proxy', displayName: 'Lite LLM Proxy', accessControlGroup: appConfig.accessControl.features.gbac.adminLiteLLMProxy, path: '/settings/lite-llm-proxy' },
    { key: 'itsm-connectors', displayName: 'ITSM Connectors', accessControlGroup: appConfig.accessControl.features.gbac.adminItsmConnectors, path: '/settings/itsm-connectors' },
    { key: 'form-management', displayName: 'Form Management', accessControlGroup: appConfig.accessControl.features.gbac.adminFormManagement, path: '/settings/form-management' },
    { key: 'vault', displayName: 'Vault', accessControlGroup: appConfig.accessControl.features.gbac.adminVault, path: '/settings/vault' },
    { key: 'sso-client', displayName: 'SSO Client', accessControlGroup: appConfig.accessControl.features.gbac.adminSsoClient, path: '/settings/sso-client' },
    { key: 'agent-gateway', displayName: 'Agent Gateway', accessControlGroup: appConfig.accessControl.features.gbac.adminAgentGateWay, path: '/settings/agent-gateway' },
];

export const Route = createFileRoute('/(app)/_app/(adminstration)/settings')({
    component: SettingsLayout,
    staticData: {
        crumb: {
            label: 'Settings',
        },
    },

    head: () => ({
        meta: [{ title: 'Settings | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Admin portal for managing ITOps Toolkit configurations' }],
    }),

    pendingMs: 1000,

    beforeLoad: async ({ location }) => {
        await requireLicensedModule(moduleIdMappings.settings, location);

        const authProviderInstance = getAuthProviderInstance();
        await authProviderInstance.initialize();

        if (!authProviderInstance.hasGroupMembership(appConfig.accessControl.pages.gbac.admin)) throw new UnAuthorisedAccessError('', '');
    },
});

function SettingsLayout() {
    const { hasGroupMembership } = useAuth();
    const navigate = useNavigate();
    const matchRoute = useMatchRoute();

    const accessibleTabs = getAvailableTabs().filter((tab) => hasGroupMembership(tab.accessControlGroup));

    const { scrollContainerRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight } = useScrollOverflow({
        direction: 'horizontal',
        scrollDistance: 300,
    });

    // settings index (landing page) - hide tab bar
    const isOnIndex = !!matchRoute({ to: '/settings', fuzzy: false });

    if (accessibleTabs.length === 0) {
        return <UnAuthorisedAccess goBack goHome message="You are not authorised to access any of the available admin tabs!" />;
    }

    return (
        <div id="admin-portal" className="w-full h-full gap-0 overflow-auto">
            <ShellLayout className="gap-0.5">
                {!isOnIndex && (
                    <ShellLayout.Header>
                        <div className="flex items-center gap-2 p-1 shadow-[0_0px_3px_1px_var(--brand-border-color)] relative">
                            <button
                                onClick={() => scrollLeft()}
                                className={twMerge(
                                    'shrink-0 absolute! left-5 cursor-pointer btn-split split-blue-light shadow p-2 rounded-full',
                                    !canScrollLeft ? 'opacity-0' : '',
                                )}
                                aria-label="Scroll tabs left"
                            >
                                <span>
                                    <FaChevronLeft />
                                </span>
                            </button>

                            <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth flex-1">
                                <div className="flex flex-nowrap gap-4 py-0.5 px-5 w-max">
                                    {accessibleTabs.map((tab) => (
                                        <TabButton
                                            key={tab.key}
                                            icon={tab.icon}
                                            id={tab.key}
                                            displayName={tab.displayName}
                                            className="min-w-max"
                                            isSelected={!!matchRoute({ to: tab.path, fuzzy: true })}
                                            onSelect={() => navigate({ to: tab.path })}
                                        />
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => scrollRight()}
                                className={twMerge(
                                    'shrink-0 absolute! right-5 cursor-pointer btn-split split-blue-light shadow p-2 rounded-full',
                                    !canScrollRight ? 'opacity-0' : '',
                                )}
                                aria-label="Scroll tabs right"
                            >
                                <span>
                                    <FaChevronRight />
                                </span>
                            </button>
                        </div>
                    </ShellLayout.Header>
                )}
                <ShellLayout.Body className="p-1">
                    <Outlet />
                </ShellLayout.Body>
            </ShellLayout>
        </div>
    );
}
