import type React from 'react';

interface HeroSectionProps {
    title: string;
    iconImage?: string;
    iconNode?: React.ReactNode;
    subTitle?: string;
    description?: string;
    warning?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({ title, iconImage, iconNode, subTitle, description, warning }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-white p-10 text-center">
            <h1 className={`font-bold mb-4 uppercase text-4xl tracking-wide text-(--brand-title-primary-color)`}>{title}</h1>

            <div className="w-30 flex justify-center items-center">
                {iconImage ? <img src={iconImage} alt="icon" className="w-1/2 h-auto" /> : null}
                {iconNode ? iconNode : null}
            </div>

            <div className="mt-2">
                <h2 className="font-bold text-base mt-2">{subTitle}</h2>
                <p className="text-gray-400 text-sm font-medium mt-1">{description}</p>
                <p className="text-amber-500 text-xs font-medium mt-1">{warning}</p>
            </div>
        </div>
    );
};

export default HeroSection;
