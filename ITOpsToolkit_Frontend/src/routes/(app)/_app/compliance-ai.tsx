import { appConfig } from '@/config/app-config';
import { moduleIdMappings } from '@/license/constants/module-id-mappings';
import { requireLicensedModule } from '@/license/utils/requireLicensedModule';
import ComponentLoadingIndicator from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import type { LandingCardProps } from '@/shared/components/ui/LandingCard/LandingCard';
import LandingCard from '@/shared/components/ui/LandingCard/LandingCard';
import { getLandingMetaById } from '@/shared/components/ui/LandingCard/utils/get-landing-meta-by-id';
import { useScrollOverflow } from '@/shared/hooks/useScrollOverflow';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { twMerge } from 'tailwind-merge';

export const Route = createFileRoute('/(app)/_app/compliance-ai')({
    staticData: { crumb: { label: 'Compliance AI' } },

    head: () => ({
        meta: [{ title: 'Compliance AI | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Compliance AI' }],
    }),
    component: CompilanceAIIndexPage,

    pendingMs: 1000,

    pendingMinMs: 1000,

    beforeLoad: async ({ location }) => {
        await requireLicensedModule(moduleIdMappings.compliance_ai, location);
    },

    pendingComponent: ComponentLoadingIndicator,
});

function CompilanceAIIndexPage() {
    const navigate = useNavigate();

    const { scrollContainerRef, canScrollRight, canScrollLeft, scrollLeft, scrollRight } = useScrollOverflow({ direction: 'horizontal', scrollDistance: 300 });

    const navigationCards: Array<{ landingCard: Omit<LandingCardProps, 'onClick'> | undefined; navigateTo: string }> = [
        { landingCard: getLandingMetaById('/compliance-ai/ticket-audit-ai'), navigateTo: appConfig.externalLinks.ticketAudit },
        { landingCard: getLandingMetaById('/compliance-ai/call-audit-ai'), navigateTo: appConfig.externalLinks.callAudit },
    ];

    return (
        <div className="px-5 h-full overflow-y-auto">
            <div className="flex flex-col items-center text-center mt-3 mb-4 px-3">
                <h1 className="text-4xl gradient-text-3 font-semibold tracking-wide mb-2">Compliance AI</h1>
                <p className="text-sm text-(--landing-purple-text) mb-1">
                    Harness the power of artificial to automate workflow , optimize operations, and drive unprecadented growth across your entire organization.
                </p>
                <h2 className="text-lg text-(--landing-teal-text) font-semibold tracking-wide mt-1">Choose your compliance AI specialist</h2>
            </div>
            {/* Scroll container with buttons aligned to cards */}
            <div className="flex items-center gap-2 w-full relative">
                {/* Left button */}
                <button
                    onClick={() => scrollLeft()}
                    className={twMerge('shrink-0 absolute! left-0 cursor-pointer btn-split split-blue-light shadow p-2 rounded-full z-10', !canScrollLeft ? 'opacity-0' : '')}
                >
                    <span>
                        {' '}
                        <FaChevronLeft />
                    </span>
                </button>

                {/* Scroll container */}
                <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-hidden scroll-smooth no-scrollbar flex-1">
                    <div className="flex mx-auto gap-4 p-6 w-max">
                        {navigationCards.map(({ landingCard, navigateTo }) => {
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
