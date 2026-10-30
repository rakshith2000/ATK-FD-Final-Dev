import React from 'react';
import './FasteLandingCard.css';

import ImageWithUnknownExt from '../ImageWithUnknowExt/ImageWithUnknowExt';
import { resolvePublicAssetPath } from '@/shared/utils/resolve-public-asset-path';

export type FasteLandingCardVariant = 'cobalt' | 'periwinkle' | 'aqua' | 'seafoam' | 'indigo';

export interface FasteLandingCardProps {
    id: string;
    title: string;
    description: string;
    iconBasePath: string;
    variant: FasteLandingCardVariant;
    circleBg: string;
    onClick: () => void;
    isHighlighted?: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

const FasteLandingCard: React.FC<FasteLandingCardProps> = ({
    title,
    id,
    description,
    iconBasePath,
    variant,
    circleBg,
    onClick,
    isHighlighted = false,
    onMouseEnter,
    onMouseLeave,
}) => {
    return (
        <div
            role="button"
            id={id}
            className={`faste-card ${isHighlighted ? 'highlighted' : ''} landing-card--${variant}`}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* Icon Circle Wrapper */}
            <div className="card-image-wrapper" style={{ backgroundColor: circleBg }}>
                <ImageWithUnknownExt
                    baseSrcWithoutFileExtension={resolvePublicAssetPath(iconBasePath)}
                    alt={title}
                    fallbackSrc={resolvePublicAssetPath('/assets/module-icons/itops-ai.png')}
                />
            </div>

            {/* Typography Blocks */}
            <h4 className="card-heading">{title}</h4>
            <p className="card-text">{description}</p>
        </div>
    );
};

export default FasteLandingCard;
