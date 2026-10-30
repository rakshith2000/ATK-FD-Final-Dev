import { twMerge, type ClassNameValue } from 'tailwind-merge';

interface ImageWithUnknownExtensionProps {
    baseSrcWithoutFileExtension: string;
    fallbackSrc?: string;
    alt?: string;
    style?: React.CSSProperties;
    className?: ClassNameValue;
}

import { useQuery } from '@tanstack/react-query';

const EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg', 'avif', 'webp'];

function resolveWorkingUrl(baseSrc: string, fallbackSrc?: string): Promise<string> {
    const srcs = EXTENSIONS.map((ext) => `${baseSrc}.${ext}`);
    const allSrcs = fallbackSrc ? [...srcs, fallbackSrc] : srcs;

    return new Promise((resolve, reject) => {
        let index = 0;

        const tryNext = () => {
            if (index >= allSrcs.length) {
                reject(new Error(`No working image found for ${baseSrc}`));
                return;
            }

            const img = new Image();
            img.src = allSrcs[index];
            img.onload = () => resolve(allSrcs[index]);
            img.onerror = () => {
                index++;
                tryNext();
            };
        };

        tryNext();
    });
}

const ImageWithUnknownExt: React.FC<ImageWithUnknownExtensionProps> = ({ baseSrcWithoutFileExtension, fallbackSrc, alt = 'brand', style, className }) => {
    const { data: resolvedSrc, isLoading } = useQuery({
        queryKey: ['img-ext', baseSrcWithoutFileExtension],
        queryFn: () => resolveWorkingUrl(baseSrcWithoutFileExtension, fallbackSrc),
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
    });

    return (
        <div className="relative inline-flex items-center justify-center overflow-hidden" style={style}>
            {isLoading && <div className="absolute inset-0 animate-pulse rounded bg-gray-200" />}
            {resolvedSrc && (
                <img
                    className={twMerge('h-full w-full object-contain transition-opacity duration-300', isLoading ? 'opacity-0' : 'opacity-100', className)}
                    src={resolvedSrc}
                    alt={alt}
                    loading="lazy"
                />
            )}
        </div>
    );
};

export default ImageWithUnknownExt;
