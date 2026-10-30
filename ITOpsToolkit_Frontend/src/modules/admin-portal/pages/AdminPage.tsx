import React, { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import TabButton from '../components/ui/TabButton/TabButton';
import useHorizontalScroll from '@/shared/hooks/useHorizontalScroll';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import AnimatedActivityPanel from '@/shared/components/ui/AnimatedActivityPanel/AnimatedActivityPanel';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import type { ToolkitPackageConfigRef } from '../modules/prompt-library/components/smart/ToolkitPackageConfiguration/ToolkitPackageConfiguration';
import { appConfig } from '@/config/app-config';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import UnAuthorisedAccess from '@/shared/components/ui/UnAuthorisedAccess/UnAuthorisedAccess';

const ITSMConnectorsTable = lazy(() => import('../modules/itsm-connectors/components/smart/ITSMConnectorsTable/ITSMConnectorsTable'));
const LiteLLMProxyConfig = lazy(() => import('../modules/lite-llm-proxy/components/smart/LiteLLMProxyConfig/LiteLLMProxyConfig'));
const LLMConfigurationsTable = lazy(() => import('../modules/llms/components/smart/LLMConfigurationsTable/LLMConfigurationsTable'));
const ToolkitPackageConfiguration = lazy(() => import('../modules/prompt-library/components/smart/ToolkitPackageConfiguration/ToolkitPackageConfiguration'));
const VaultConfig = lazy(() => import('../modules/vault/components/ui/VaultConfig/VaultConfig'));
const FormManagementIndexPage = lazy(() => import('../modules/form-builder/pages/FormManagementIndexPage'));
const SSOClientConfig = lazy(() => import('../modules/sso-client/components/ui/SSOClientConfig/SSOClientConfig'));

interface AdminTab {
    key: string;
    displayName: string;
    icon?: ReactNode;
    accessControlGroup: string;
}

const getAvailableTabs = (): AdminTab[] => [
    { key: 'prompt-library', displayName: 'Prompt Library', accessControlGroup: appConfig.accessControl.features.gbac.adminPromptLibrary },
    { key: 'llm-models', displayName: 'LLM Models', accessControlGroup: appConfig.accessControl.features.gbac.adminLlmModels },
    { key: 'lite-llm-proxy', displayName: 'Lite LLM Proxy', accessControlGroup: appConfig.accessControl.features.gbac.adminLiteLLMProxy },
    { key: 'itsm-connectors', displayName: 'ITSM Connectors', accessControlGroup: appConfig.accessControl.features.gbac.adminItsmConnectors },
    { key: 'form-management', displayName: 'Form Management', accessControlGroup: appConfig.accessControl.features.gbac.adminFormManagement },
    { key: 'vault', displayName: 'Vault', accessControlGroup: appConfig.accessControl.features.gbac.adminVault },
    { key: 'sso-client', displayName: 'SSO Client', accessControlGroup: appConfig.accessControl.features.gbac.adminSsoClient },
];

const ADMIN_PAGE_MARKER = '__adminPage__';

const AdminPage: React.FC = () => {
    const { hasGroupMembership } = useAuth();

    const accessiableAdminTabs = getAvailableTabs().filter((tab) => hasGroupMembership(tab.accessControlGroup));

    const [selectedTab, setSelectedTab] = useState<AdminTab>(accessiableAdminTabs[0]);

    const toolkitPackageConfigurationRef = useRef<ToolkitPackageConfigRef>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    useHorizontalScroll(scrollRef, 10);

    // Ref to track current package without stale closure
    const selectedPackageRef = useRef<string | null>(null);

    const selectedTabRef = useRef<AdminTab>(getAvailableTabs()[0]);

    useEffect(() => {
        if (selectedTab) {
            selectedTabRef.current = selectedTab;
        }
    }, [selectedTab]);

    useEffect(() => {
        // Tag the current entry as "admin page, no package"
        window.history.replaceState({ [ADMIN_PAGE_MARKER]: true, hasPackage: false }, '');

        const handlePopState = (event: PopStateEvent) => {
            const state = event.state as Record<string, unknown> | null;

            if (!state?.[ADMIN_PAGE_MARKER]) return;

            const currentPackage = selectedPackageRef.current;
            const currentTab = selectedTabRef.current;

            // ONLY intercept when on Prompt Library tab
            if (currentTab.key === 'prompt-library' && currentPackage !== null) {
                selectedPackageRef.current = null;
                toolkitPackageConfigurationRef.current?.setSelectedPackage(null);

                // stay on prompt-library tab
                setSelectedTab(getAvailableTabs().find((t) => t.key === 'prompt-library')!);

                return;
            }

            // If NOT on prompt-library -> DO NOTHING
            // browser will navigate back normally
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.history.replaceState(null, '');
        };
    }, []);

    const handleOnTabSelected = useCallback((selectedTabKey: string) => {
        const tab = getAvailableTabs().find((t) => t.key === selectedTabKey);
        if (!tab) return;

        const wasInPromptLibrary = selectedTabRef.current.key === 'prompt-library';
        const hadPackage = selectedPackageRef.current !== null;

        // If leaving Prompt Library while package is selected -> FIX history
        if (wasInPromptLibrary && hadPackage) {
            window.history.back(); // removes the pushed package state
            selectedPackageRef.current = null;
            toolkitPackageConfigurationRef.current?.setSelectedPackage(null);
        }

        if (tab.key === 'prompt-library') {
            selectedPackageRef.current = null;
            toolkitPackageConfigurationRef.current?.setSelectedPackage(null);
        }

        selectedTabRef.current = tab;
        setSelectedTab(tab);
    }, []);

    if (accessiableAdminTabs?.length <= 0) {
        return <UnAuthorisedAccess goBack goHome message="Your are not authorised to access any of the available admin tabs !" />;
    }

    return (
        <div id="admin-portal" className="w-full h-full gap-0 overflow-auto">
            <ShellLayout className="gap-0.5">
                <ShellLayout.Header>
                    <div ref={scrollRef} className="mt-0 overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth shadow-[0_0px_3px_1px_var(--brand-border-color)] p-1">
                        <div className="flex flex-nowrap gap-4 py-0.5 px-5">
                            {accessiableAdminTabs.map((tab) => (
                                <TabButton
                                    key={tab.key}
                                    icon={tab.icon}
                                    id={tab.key}
                                    displayName={tab.displayName}
                                    className="min-w-max"
                                    isSelected={selectedTab.key === tab.key}
                                    onSelect={handleOnTabSelected}
                                />
                            ))}
                        </div>
                    </div>
                </ShellLayout.Header>
                <ShellLayout.Body className="p-1">
                    <Suspense fallback={<ComponentLoadingIndicator />}>
                        {selectedTab.key === 'prompt-library' ? (
                            <AnimatedActivityPanel key="prompt-library" active>
                                <ToolkitPackageConfiguration
                                    ref={toolkitPackageConfigurationRef}
                                    onPackageSelected={(pkg) => {
                                        selectedPackageRef.current = pkg;

                                        if (selectedTabRef.current.key === 'prompt-library') {
                                            window.history.pushState({ [ADMIN_PAGE_MARKER]: true, hasPackage: true }, '');
                                        }
                                    }}
                                />
                            </AnimatedActivityPanel>
                        ) : null}
                        {selectedTab.key === 'llm-models' ? (
                            <AnimatedActivityPanel key="llm-models" active>
                                <LLMConfigurationsTable />
                            </AnimatedActivityPanel>
                        ) : null}
                        {selectedTab.key === 'lite-llm-proxy' ? (
                            <AnimatedActivityPanel key="lite-llm-proxy" active>
                                <LiteLLMProxyConfig />
                            </AnimatedActivityPanel>
                        ) : null}
                        {selectedTab.key === 'itsm-connectors' ? (
                            <AnimatedActivityPanel key="itsm-connectors" active>
                                <ITSMConnectorsTable />
                            </AnimatedActivityPanel>
                        ) : null}
                        {selectedTab.key === 'form-management' ? (
                            <AnimatedActivityPanel key="form-management" active>
                                <FormManagementIndexPage />
                            </AnimatedActivityPanel>
                        ) : null}
                        {selectedTab.key === 'vault' ? (
                            <AnimatedActivityPanel key="vault" active>
                                <VaultConfig />
                            </AnimatedActivityPanel>
                        ) : null}
                        {selectedTab.key === 'sso-client' ? (
                            <AnimatedActivityPanel key="sso-client" active>
                                <SSOClientConfig />
                            </AnimatedActivityPanel>
                        ) : null}
                    </Suspense>
                </ShellLayout.Body>
            </ShellLayout>
        </div>
    );
};

export default AdminPage;
