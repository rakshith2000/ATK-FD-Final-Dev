import { memo } from 'react';

export interface DidYouKnowBannerProps {
    message: string;
}

/** Full-width tip banner with a brand-coloured left accent. */
const DidYouKnowBanner: React.FC<DidYouKnowBannerProps> = memo(({ message }) => {
    return (
        <div className="rounded-xl border border-indigo-100 border-l-4 border-l-indigo-500 bg-indigo-50/60 px-5 py-4">
            <p className="text-sm text-(--brand-title-primary-color)">
                <strong>Did you Know?</strong> {message}
            </p>
        </div>
    );
});

DidYouKnowBanner.displayName = 'DidYouKnowBanner';

export default DidYouKnowBanner;
