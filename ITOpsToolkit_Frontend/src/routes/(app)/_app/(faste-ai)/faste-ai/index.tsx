import LandingCard, { type LandingCardVariant } from '@/shared/components/ui/LandingCard/LandingCard';
import { getLandingMetaById } from '@/shared/components/ui/LandingCard/utils/get-landing-meta-by-id';
import { useScrollOverflow } from '@/shared/hooks/useScrollOverflow';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { twMerge } from 'tailwind-merge';

export const Route = createFileRoute('/(app)/_app/(faste-ai)/faste-ai/')({
    head: () => ({
        meta: [{ title: 'FASTE AI | Autonomous Automation Toolkit' }, { name: 'description', content: 'Agentic task execution and intelligent performance dashboards.' }],
    }),
    component: FasteAiIndexPage,
});

function FasteAiIndexPage() {
    const navigate = useNavigate();

    const { scrollContainerRef, canScrollRight, canScrollLeft, scrollLeft, scrollRight } = useScrollOverflow({
        direction: 'horizontal',
        scrollDistance: 350,
    });

    const navigationCards = [
        { landingCard: getLandingMetaById('/faste-ai/faste-dashboard'), navigateTo: '/faste-ai/faste-dashboard' },
        { landingCard: getLandingMetaById('/faste-ai/sop-dashboard'), navigateTo: '/faste-ai/sop-dashboard' },
        { landingCard: getLandingMetaById('/faste-ai/schedule-dashboard'), navigateTo: '/faste-ai/schedule-dashboard' },
    ];

    return (
        <div className="px-5 py-4 w-full">
            <div className="flex flex-col items-center justify-center text-center mt-2 mb-6 px-3">
                <span className="text-[0.95rem] font-bold text-(--landing-blue-text) tracking-wide mb-1">Transform Your ITOps with</span>

                <div className="bg-[#3b5cd7] text-white px-3 py-2 rounded-[50px] shadow-sm mx-auto my-3 fit-content">
                    <h1 className="text-4xl font-bold tracking-wide m-0 leading-none">FASTE AI</h1>
                </div>

                <p className="text-sm text-(--landing-purple-text) max-w-2xl mt-2 mb-1 font-medium">
                    Harness the power of artificial intelligence to automate workflows and optimize operations.
                </p>

                <h2 className="text-xl font-semibold text-(--landing-teal-text) tracking-wide mt-4">Choose your Analytics AI specialist</h2>
            </div>

            <div className="flex items-center gap-2 w-full mt-5">
                <button
                    onClick={() => scrollLeft()}
                    className={twMerge('shrink-0 cursor-pointer text-(--brand-color) bg-white shadow p-2 rounded-full z-10', !canScrollLeft ? 'opacity-0 pointer-events-none' : '')}
                >
                    <FaChevronLeft />
                </button>

                <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-hidden scroll-smooth no-scrollbar flex-1">
                    <div className="flex mx-auto gap-4 p-6 w-max">
                        {navigationCards.map(({ landingCard, navigateTo }) => {
                            if (!landingCard) {
                                return null;
                            }
                            return (
                                <div key={`${landingCard.title}`} className="min-h-50 flex">
                                    <LandingCard
                                        id={`${landingCard.id}`}
                                        circleBg={landingCard.circleBg}
                                        description={landingCard.description}
                                        iconBasePath={landingCard.iconBasePath}
                                        title={landingCard.title}
                                        variant={landingCard.variant as LandingCardVariant}
                                        onClick={() => navigate({ to: navigateTo, viewTransition: true })}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button
                    onClick={() => scrollRight()}
                    className={twMerge(
                        'shrink-0 cursor-pointer text-(--brand-color) bg-white shadow p-2 rounded-full z-10',
                        !canScrollRight ? 'opacity-0 pointer-events-none' : '',
                    )}
                >
                    <FaChevronRight />
                </button>
            </div>
        </div>
    );
}
