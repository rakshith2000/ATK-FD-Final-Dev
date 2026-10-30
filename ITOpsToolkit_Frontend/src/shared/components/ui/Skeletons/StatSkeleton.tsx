import React from 'react';
import ContentLoader from 'react-content-loader';
import { SKELETON_PROPS, type SkeletonVariantProps } from './primitives';

interface StatSkeletonProps extends SkeletonVariantProps {
    VW?: number;
    CELL_H?: number;
    GAP?: number;
}

const StatSkeleton: React.FC<StatSkeletonProps> = ({ rows = 1, cols = 1, height, className, VW = 400, CELL_H = 110, GAP = 1 }) => {
    const VH = rows * CELL_H + (rows - 1) * GAP;
    const cellW = (VW - (cols - 1) * GAP) / cols;
    const cellH = (VH - (rows - 1) * GAP) / rows;

    return (
        <div className={className} style={{ width: '100%', ...(height != null ? { height } : { height: '100%', minHeight: VH }) }}>
            <ContentLoader viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} {...SKELETON_PROPS}>
                {Array.from({ length: rows }, (_, r) =>
                    Array.from({ length: cols }, (_, c) => {
                        const x = c * (cellW + GAP);
                        const y = r * (cellH + GAP);
                        const cx = x + cellW / 2;

                        const numW = cellW * 0.25;
                        const numH = Math.min(cellH * 0.38, 28);
                        const lbl1W = cellW * 0.45;
                        const lbl2W = cellW * 0.3;
                        const lblH = Math.min(cellH * 0.12, 8);

                        const totalH = numH + 6 + lblH + 4 + lblH;
                        const startY = y + (cellH - totalH) / 2;
                        const numY = startY;
                        const lbl1Y = numY + numH + 6;
                        const lbl2Y = lbl1Y + lblH + 4;

                        return (
                            <React.Fragment key={`${r}-${c}`}>
                                <circle cx={cx} cy={y + cellH * 0.15} r={Math.min(cellH * 0.1, 10)} />
                                <rect x={cx - numW / 2} y={numY} rx={4} ry={4} width={numW} height={numH} />
                                <rect x={cx - lbl1W / 2} y={lbl1Y} rx={3} ry={3} width={lbl1W} height={lblH} />
                                <rect x={cx - lbl2W / 2} y={lbl2Y} rx={3} ry={3} width={lbl2W} height={lblH} />
                            </React.Fragment>
                        );
                    }),
                )}
            </ContentLoader>
        </div>
    );
};

export default StatSkeleton;
