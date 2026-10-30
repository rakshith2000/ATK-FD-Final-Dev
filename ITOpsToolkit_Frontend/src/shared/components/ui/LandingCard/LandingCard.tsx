import type { moduleIdMappings } from '@/license/constants/module-id-mappings';
import ImageWithUnknownExt from '../ImageWithUnknowExt/ImageWithUnknowExt';
import './LandingCard.css';
import { resolvePublicAssetPath } from '@/shared/utils/resolve-public-asset-path';

export type LandingCardVariant = 'cobalt' | 'periwinkle' | 'aqua' | 'seafoam';

export interface LandingCardProps {
    id: string;
    licensedModuleId?: keyof typeof moduleIdMappings;
    title: string;
    description: string;
    iconBasePath: string;
    agents?: string[];
    features?: string[];
    variant: LandingCardVariant;
    circleBg: string;
    onClick?: () => void;
}

const LandingCard: React.FC<LandingCardProps> = ({ title, id, description, iconBasePath, agents, features, variant, circleBg, onClick }) => {
    return (
        <div role="button" id={id} className={`landing-card landing-card--${variant}`} onClick={onClick}>
            {/* Icon + Title */}
            <div className="flex flex-col items-center">
                <div className="landing-card__icon-circle" style={{ backgroundColor: circleBg }}>
                    <ImageWithUnknownExt
                        baseSrcWithoutFileExtension={resolvePublicAssetPath(iconBasePath)}
                        alt={title}
                        fallbackSrc={resolvePublicAssetPath('/assets/module-icons/itops-ai.png')}
                    />
                </div>
                <h3 className={`landing-card__title landing-card__title--${variant}`}>{title}</h3>
            </div>

            {/* Separator */}
            <div className="landing-card__separator">
                <div className="landing-card__separator-line" />
                <div className={`landing-card__separator-triangle landing-card__separator-triangle--${variant}`} />
            </div>

            {/* Description */}
            <div className="landing-card__description">
                <p className="landing-card__description-text">{description}</p>
            </div>

            {/* Agents */}
            {agents ? (
                <div className="landing-card__agents">
                    <p className="landing-card__agents-label">Agents Included:</p>
                    <div className="landing-card__agents-list">
                        {agents.map((agent) => (
                            <div key={agent} className="landing-card__agent-item">
                                <span className={`landing-card__agent-dot landing-card__agent-dot--${variant}`} />
                                <span className="landing-card__agent-name">{agent}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            {/* Features */}
            {features ? (
                <div className="landing-card__agents">
                    <p className="landing-card__agents-label">Features Included:</p>
                    <div className="landing-card__agents-list">
                        {features.map((agent) => (
                            <div key={agent} className="landing-card__agent-item">
                                <span className={`landing-card__agent-dot landing-card__agent-dot--${variant}`} />
                                <span className="landing-card__agent-name">{agent}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default LandingCard;
