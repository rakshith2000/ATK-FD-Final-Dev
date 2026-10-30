import { useLicense } from '@/license/hooks/useLicense';
import type { LandingCardProps } from '@/shared/components/ui/LandingCard/LandingCard';
import LandingCard from '@/shared/components/ui/LandingCard/LandingCard';
import { getLandingMetaById } from '@/shared/components/ui/LandingCard/utils/get-landing-meta-by-id';
import { EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import { useScrollOverflow } from '@/shared/hooks/useScrollOverflow';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { twMerge } from 'tailwind-merge';

export const Route = createFileRoute('/(app)/_app/(dashboards)/dashboards/')({
    head: () => ({
        meta: [
            { title: 'Dashboards | Autonomous ITOps Toolkit' },
            { name: 'description', content: 'Operational dashboards for incident, change, problem and service request management' },
        ],
    }),
    component: DashboardsIndexPage,
});

function DashboardsIndexPage() {
    const { hasModule: canLoadLicensedModuleMeta } = useLicense();

    const navigate = useNavigate();

    const { scrollContainerRef, canScrollRight, canScrollLeft, scrollLeft, scrollRight } = useScrollOverflow({ direction: 'horizontal', scrollDistance: 300 });

    const navigationCards: Array<{ landingCard: Omit<LandingCardProps, 'onClick'> | undefined; navigateTo: string }> = [
        { landingCard: getLandingMetaById('/dashboards/incident-dashboard', canLoadLicensedModuleMeta), navigateTo: '/dashboards/incident-dashboard' },
        { landingCard: getLandingMetaById('/dashboards/change-dashboard', canLoadLicensedModuleMeta), navigateTo: '/dashboards/change-dashboard' },
        { landingCard: getLandingMetaById('/dashboards/problem-dashboard', canLoadLicensedModuleMeta), navigateTo: '/dashboards/problem-dashboard' },
        { landingCard: getLandingMetaById('/dashboards/service-request-dashboard', canLoadLicensedModuleMeta), navigateTo: '/dashboards/service-request-dashboard' },
    ].filter(({ landingCard }) => !!landingCard);

    return (
        <div className="px-5 h-full overflow-y-auto">
            <div className="flex flex-col items-center text-center mt-3 mb-4 px-3">
                <h1 className="text-4xl gradient-text-3 font-semibold tracking-wide mb-2">Dashboards</h1>
                <p className="text-sm text-(--landing-purple-text) mb-1">
                    A consolidated view of your IT operations across incident, change, problem and service request management.
                    <br />
                    Drill into volume, priority and ageing trends to spot risk before it becomes an outage.
                </p>
                <h2 className="text-lg text-(--landing-teal-text) font-semibold tracking-wide mt-1">Explore operational dashboards</h2>
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
                                    features={landingCard.features}
                                    iconBasePath={landingCard.iconBasePath}
                                    title={landingCard.title}
                                    variant={landingCard.variant}
                                    onClick={() => navigate({ to: navigateTo, viewTransition: true })}
                                />
                            );
                        })}

                        {navigationCards.length === 0 ? <EmptyPlaceholder message="No Dashboards found !" iconSize={200} /> : null}
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
