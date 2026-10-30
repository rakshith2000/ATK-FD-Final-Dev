import React from 'react';
import ContentLoader from 'react-content-loader';
import { twMerge } from 'tailwind-merge';
import { SKELETON_PROPS, type SkeletonVariantProps } from './primitives';

const LINE_WIDTHS = [0.55, 0.4, 0.7, 0.45, 0.6, 0.35, 0.65] as const;

interface ListSkeletonProps extends SkeletonVariantProps {
    VW?: number;
    ROW_H?: number;
    LINE_GAP?: number;
    PAD_X?: number;
}

const ListSkeleton: React.FC<ListSkeletonProps> = ({ rows = 3, height, className, VW = 400, ROW_H = 52, LINE_GAP = 10, PAD_X = 4 }) => {
    const VH = rows * ROW_H;
    const avatarR = Math.min(ROW_H * 0.28, 14);
    const lineH = Math.min(ROW_H * 0.16, 9);
    const textX = avatarR * 2.8;

    return (
        <div className={twMerge(className)} style={{ width: '100%', ...(height != null ? { height } : { height: '100%', minHeight: VH }) }}>
            <ContentLoader viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} {...SKELETON_PROPS}>
                {Array.from({ length: rows }, (_, i) => {
                    const cy = i * ROW_H + ROW_H / 2;
                    const titleW = VW * LINE_WIDTHS[i % LINE_WIDTHS.length];
                    const subtitleW = VW * 0.82;

                    return (
                        <React.Fragment key={i}>
                            <circle cx={PAD_X + avatarR} cy={cy} r={avatarR} />
                            <rect x={textX} y={cy - lineH - LINE_GAP / 2} rx={3} ry={3} width={titleW} height={lineH} />
                            <rect x={textX} y={cy + LINE_GAP / 2} rx={3} ry={3} width={subtitleW} height={lineH - 1} />
                            {i < rows - 1 && <rect x={textX} y={(i + 1) * ROW_H - 1} rx={0} ry={0} width={VW - textX} height={0.75} />}
                        </React.Fragment>
                    );
                })}
            </ContentLoader>
        </div>
    );
};

export default ListSkeleton;
