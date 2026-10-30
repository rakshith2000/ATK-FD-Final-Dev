import { useLicense } from '@/license/hooks/useLicense';
import type { LandingCardProps } from '@/shared/components/ui/LandingCard/LandingCard';
import LandingCard from '@/shared/components/ui/LandingCard/LandingCard';
import { getLandingMetaById } from '@/shared/components/ui/LandingCard/utils/get-landing-meta-by-id';
import { EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import { useScrollOverflow } from '@/shared/hooks/useScrollOverflow';
import { useNavigate } from '@tanstack/react-router';
import { createFileRoute } from '@tanstack/react-router';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { twMerge } from 'tailwind-merge';

export const Route = createFileRoute('/(app)/_app/(transition-ai)/transition-ai/')({
    head: () => ({
        meta: [{ title: 'Transition AI | Autonomous ITOps Toolkit' }, { name: 'description', content: 'AI-powered transition management tools' }],
    }),
    component: TransitionAIIndexPage,
});

function TransitionAIIndexPage() {
    const navigate = useNavigate();

    const { hasModule: canLoadLicensedModuleMeta } = useLicense();

    const { scrollContainerRef, canScrollRight, canScrollLeft, scrollLeft, scrollRight } = useScrollOverflow({ direction: 'horizontal', scrollDistance: 300 });

    const navigationCards: Array<{ landingCard: Omit<LandingCardProps, 'onClick'> | undefined; navigateTo: string }> = [
        { landingCard: getLandingMetaById('/transition/knowledge-ai', canLoadLicensedModuleMeta), navigateTo: '/transition-ai/knowledge-ai' },
        { landingCard: getLandingMetaById('/transition/train-ai', canLoadLicensedModuleMeta), navigateTo: '/transition-ai/train-ai' },
        { landingCard: getLandingMetaById('/transition/meeting-ai', canLoadLicensedModuleMeta), navigateTo: '/transition-ai/meeting-ai' },
    ].filter(({ landingCard }) => !!landingCard);

    return (
        <div className="px-5 h-full overflow-y-auto">
            <div className="flex flex-col items-center text-center mt-3 mb-4 px-3">
                <h1 className="text-4xl gradient-text-3 font-semibold tracking-wide mb-2">Transition AI</h1>
                <p className="text-sm text-(--landing-purple-text) mb-1">
                    A unified, AI-powered toolkit to automate, optimize, and scale IT operations.
                    <br />
                    Enable intelligent workflows, faster resolution, and resilient operations across the IT landscape.
                </p>
                <h2 className="text-lg text-(--landing-teal-text) font-semibold tracking-wide mt-1">Explore ITOps AI Capabilities powered by specialized agents</h2>
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
                                    iconBasePath={landingCard.iconBasePath}
                                    title={landingCard.title}
                                    variant={landingCard.variant}
                                    onClick={() => navigate({ to: navigateTo, viewTransition: true })}
                                />
                            );
                        })}
                        {navigationCards.length === 0 ? <EmptyPlaceholder message="No Modules found !" iconSize={200} /> : null}
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
