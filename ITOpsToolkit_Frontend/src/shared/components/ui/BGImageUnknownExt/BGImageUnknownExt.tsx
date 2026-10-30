import { useEffect, useState } from 'react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';

const FORMATS = ['svg', 'avif', 'webp', 'png', 'jpg', 'jpeg'];

interface BGImageUnknownExtProps {
    baseSrc: string;
    children?: React.ReactNode;
    className?: ClassNameValue;
    style?: React.CSSProperties;
}

const BGImageUnknownExt: React.FC<BGImageUnknownExtProps> = ({ baseSrc, children, className, style }) => {
    const [bgSrc, setBgSrc] = useState<string | null>(null);

    useEffect(() => {
        const tryNext = (index: number) => {
            if (index >= FORMATS.length) return;

            const img = new Image();
            img.src = `${baseSrc}.${FORMATS[index]}`;
            img.onload = () => setBgSrc(img.src);
            img.onerror = () => tryNext(index + 1);
        };

        tryNext(0);
    }, [baseSrc]);

    return (
        <div
            className={twMerge(className)}
            style={{
                backgroundImage: bgSrc ? `url('${bgSrc}')` : 'none',
                backgroundRepeat: 'no-repeat',
                backgroundOrigin: 'content-box',
                backgroundPosition: 'center',
                backgroundSize: 'cover',
                ...style,
            }}
        >
            {children}
        </div>
    );
};

export default BGImageUnknownExt;
