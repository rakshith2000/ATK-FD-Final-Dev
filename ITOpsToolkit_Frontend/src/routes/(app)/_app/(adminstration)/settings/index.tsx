import { appConfig } from '@/config/app-config';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import type { LandingCardProps } from '@/shared/components/ui/LandingCard/LandingCard';
import LandingCard from '@/shared/components/ui/LandingCard/LandingCard';
import { getLandingMetaById } from '@/shared/components/ui/LandingCard/utils/get-landing-meta-by-id';
import { useScrollOverflow } from '@/shared/hooks/useScrollOverflow';
import UnAuthorisedAccess from '@/shared/components/ui/UnAuthorisedAccess/UnAuthorisedAccess';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { twMerge } from 'tailwind-merge';

const getSettingsCards = (): Array<{ landingCardId: string; navigateTo: string; accessControl: string }> => [
    { landingCardId: '/admin/prompt-library', navigateTo: '/settings/prompt-library', accessControl: appConfig.accessControl.features.gbac.adminPromptLibrary },
    { landingCardId: '/admin/llm-models', navigateTo: '/settings/llm-models', accessControl: appConfig.accessControl.features.gbac.adminLlmModels },
    { landingCardId: '/admin/lite-llm-proxy', navigateTo: '/settings/lite-llm-proxy', accessControl: appConfig.accessControl.features.gbac.adminLiteLLMProxy },
    { landingCardId: '/admin/itsm-connectors', navigateTo: '/settings/itsm-connectors', accessControl: appConfig.accessControl.features.gbac.adminItsmConnectors },
    { landingCardId: '/admin/form-management', navigateTo: '/settings/form-management', accessControl: appConfig.accessControl.features.gbac.adminFormManagement },
    { landingCardId: '/admin/vault', navigateTo: '/settings/vault', accessControl: appConfig.accessControl.features.gbac.adminVault },
    { landingCardId: '/admin/sso-client', navigateTo: '/settings/sso-client', accessControl: appConfig.accessControl.features.gbac.adminSsoClient },
    { landingCardId: '/admin/agent-gateway', navigateTo: '/settings/agent-gateway', accessControl: appConfig.accessControl.features.gbac.adminAgentGateWay },
];

export const Route = createFileRoute('/(app)/_app/(adminstration)/settings/')({
    component: SettingsIndexPage,
});

function SettingsIndexPage() {
    const navigate = useNavigate();
    const { hasGroupMembership } = useAuth();

    const { scrollContainerRef, canScrollRight, canScrollLeft, scrollLeft, scrollRight } = useScrollOverflow({ direction: 'horizontal', scrollDistance: 300 });

    const accessibleCards: Array<{ landingCard: Omit<LandingCardProps, 'onClick'> | undefined; navigateTo: string }> = getSettingsCards()
        .filter((card) => hasGroupMembership(card.accessControl))
        .map((card) => ({
            landingCard: getLandingMetaById(card.landingCardId),
            navigateTo: card.navigateTo,
        }));

    if (accessibleCards.length === 0) {
        return <UnAuthorisedAccess goBack goHome message="You are not authorised to access any of the available admin tabs!" />;
    }

    return (
        <div className="px-5 h-full overflow-y-auto">
            <div className="flex flex-col items-center text-center mt-3 mb-4 px-3">
                <h1 className="text-4xl gradient-text-3 font-semibold tracking-wide mb-2 p-0.5">Settings</h1>
                <p className="text-sm text-(--landing-purple-text) mb-1">
                    Manage and configure your ITOps Toolkit platform settings.
                    <br />
                    Configure AI models, connectors, security, and operational workflows.
                </p>
                <h2 className="text-lg text-(--landing-teal-text) font-semibold tracking-wide mt-1">Select a configuration module to get started</h2>
            </div>
            {/* Scroll container with buttons aligned to cards */}
            <div className="flex items-center gap-2 w-full relative">
                {/* Left button */}
                <button
                    onClick={() => scrollLeft()}
                    className={twMerge('shrink-0 absolute! left-0 cursor-pointer btn-split split-blue-light shadow p-2 rounded-full z-10', !canScrollLeft ? 'opacity-0' : '')}
                >
                    <span>
                        <FaChevronLeft />
                    </span>
                </button>

                {/* Scroll container */}
                <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-hidden scroll-smooth no-scrollbar flex-1">
                    <div className="flex mx-auto gap-4 p-6 w-max">
                        {accessibleCards.map(({ landingCard, navigateTo }) => {
                            if (!landingCard) {
                                return;
                            }
                            return (
                                <LandingCard
                                    id={`${landingCard.id}`}
                                    key={`${landingCard.title}`}
                                    agents={landingCard.agents}
                                    circleBg={landingCard.circleBg}
                                    description={landingCard.description}
                                    iconBasePath={landingCard.iconBasePath}
                                    title={landingCard.title}
                                    features={landingCard.features}
                                    variant={landingCard.variant}
                                    onClick={() => {
                                        if (navigateTo.startsWith('http')) {
                                            window.open(navigateTo, '_blank');
                                        } else {
                                            navigate({ to: navigateTo, viewTransition: true });
                                        }
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Right button */}
                <button
                    onClick={() => scrollRight()}
                    className={twMerge('shrink-0 absolute! right-0 cursor-pointer btn-split split-blue-light shadow p-2 rounded-full z-10', !canScrollRight ? 'opacity-0' : '')}
                >
                    <span>
                        <FaChevronRight />
                    </span>
                </button>
            </div>
        </div>
    );
}
