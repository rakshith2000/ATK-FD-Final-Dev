import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import getAllowedPromptLibraryOptions from '../../../utils/get-allowed-prompt-libraries';
import UnAuthorisedAccess from '@/shared/components/ui/UnAuthorisedAccess/UnAuthorisedAccess';
import { moduleLandingCardsMeta } from '@/shared/components/ui/LandingCard/contants/module-landing-cards-meta';
import LandingCard from '@/shared/components/ui/LandingCard/LandingCard';
import { useScrollOverflow } from '@/shared/hooks/useScrollOverflow';
import { twMerge } from 'tailwind-merge';

interface PromptLibraryListProps {
    setSelectedPackage: (s: string) => void;
}

const PromptLibraryList: React.FC<PromptLibraryListProps> = ({ setSelectedPackage }) => {
    const allowedPromptLibraries = getAllowedPromptLibraryOptions();

    const { scrollContainerRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight } = useScrollOverflow({
        direction: 'horizontal',
        scrollDistance: 300,
        wheelSpeed: 10,
    });

    if (!allowedPromptLibraries.length) {
        return <UnAuthorisedAccess goBack goHome message="Your are not authorised to access any of the available prompt libraries !" />;
    }

    const moduleLandingCardsMetaForAllowedPromptLibraries: Array<{
        promptLibrary: (typeof allowedPromptLibraries)[number];
        landingCardMeta: (typeof moduleLandingCardsMeta)[number];
    }> = [];

    for (const cardMeta of moduleLandingCardsMeta) {
        for (const lib of allowedPromptLibraries) {
            if (lib.landingCardId === cardMeta.id) {
                moduleLandingCardsMetaForAllowedPromptLibraries.push({
                    promptLibrary: lib,
                    landingCardMeta: cardMeta,
                });
            }
        }
    }

    return (
        <div className="w-full h-full flex justify-center items-start p-2">
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
                        {moduleLandingCardsMetaForAllowedPromptLibraries.map(({ landingCardMeta, promptLibrary }) => (
                            <LandingCard
                                id={`${landingCardMeta.id}`}
                                key={`${landingCardMeta.title}`}
                                agents={landingCardMeta.agents}
                                circleBg={landingCardMeta.circleBg}
                                description={landingCardMeta.description}
                                iconBasePath={landingCardMeta.iconBasePath}
                                title={landingCardMeta.title}
                                variant={landingCardMeta.variant}
                                onClick={() => setSelectedPackage(promptLibrary.value)}
                            />
                        ))}
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
};

export default PromptLibraryList;
