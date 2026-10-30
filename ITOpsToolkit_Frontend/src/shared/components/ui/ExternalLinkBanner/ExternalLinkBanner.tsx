import { ExternalLink } from 'lucide-react';

interface ExternalLinkBannerProps {
    label?: string;
    onClick?: () => void;
}

const ExternalLinkBanner: React.FC<ExternalLinkBannerProps> = ({ label = 'Click here to open the page', onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="group relative w-full overflow-hidden rounded-xl px-6 py-4 flex gap-3 items-center justify-center cursor-pointer transition-all duration-300 brand-gradient-top-left-bottom-right shadow-md hover:shadow-lg hover:shadow-blue-200 active:scale-[0.99]"
    >
        {/* Shimmer */}
        <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-linear-to-r from-transparent via-white/15 to-transparent" />

        <ExternalLink size={15} className="text-(--brand-text-inverse) group-hover:text-(--brand-text-inverse) group-hover:rotate-12 transition-all duration-300 shrink-0" />
        <span className="text-sm font-semibold tracking-wide text-(--brand-text-inverse) group-hover:text-9--brand-text-inverse transition-colors duration-300">{label}</span>
    </button>
);

export default ExternalLinkBanner;
