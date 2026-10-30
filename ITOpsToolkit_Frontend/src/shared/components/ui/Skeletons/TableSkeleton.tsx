import React from 'react';
import ContentLoader from 'react-content-loader';
import { SKELETON_PROPS, type SkeletonVariantProps } from './primitives';

interface TableSkeletonProps extends SkeletonVariantProps {
    VW?: number;
    HEADER_H?: number;
    GAP?: number;
    COL_GAP?: number;
    ROW_H?: number;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, cols = 4, height, className, VW = 400, HEADER_H = 12, GAP = 2, COL_GAP = 12, ROW_H = 36 }) => {
    const DIVIDER_Y = HEADER_H + GAP;
    const BODY_START = DIVIDER_Y + GAP;
    const VH = BODY_START + rows * ROW_H;
    const lineH = Math.min(ROW_H * 0.35, 12);
    const colW = (VW - (cols - 1) * COL_GAP) / cols;

    return (
        <div className={className} style={{ width: '100%', ...(height != null ? { height } : { height: '100%', minHeight: VH }) }}>
            <ContentLoader viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} {...SKELETON_PROPS}>
                {Array.from({ length: cols }, (_, ci) => (
                    <rect key={`h-${ci}`} x={ci * (colW + COL_GAP)} y={0} rx={3} ry={3} width={ci === cols - 1 ? colW * 0.9 : colW} height={HEADER_H} />
                ))}

                <rect x={0} y={DIVIDER_Y} width={VW} height={1} />

                {Array.from({ length: rows }, (_, ri) => {
                    const y = BODY_START + ri * ROW_H + (ROW_H - lineH) / 2;
                    return Array.from({ length: cols }, (_, ci) => (
                        <rect
                            key={`r${ri}-c${ci}`}
                            x={ci * (colW + COL_GAP)}
                            y={y}
                            rx={3}
                            ry={3}
                            width={ci === cols - 1 ? colW * 0.9 : colW * [0.8, 1, 0.8, 1, 0.8][ci % 5]}
                            height={lineH}
                        />
                    ));
                })}

                {Array.from({ length: rows - 1 }, (_, ri) => (
                    <rect key={`d-${ri}`} x={0} y={BODY_START + (ri + 1) * ROW_H - 1} width={VW} height={0.5} />
                ))}
            </ContentLoader>
        </div>
    );
};

export default TableSkeleton;
