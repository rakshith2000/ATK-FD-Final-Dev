import ContentLoader from 'react-content-loader';
import { SKELETON_PROPS, type SkeletonVariantProps } from './primitives';

interface GridSkeletonVariantProps extends SkeletonVariantProps {
    VW?: number;
    GAP?: number;
}

const GridSkeleton: React.FC<GridSkeletonVariantProps> = ({ rows = 3, cols = 2, height, className, GAP = 2, VW = 400 }) => {
    const VH = rows * 60;
    const cellW = (VW - (cols - 1) * GAP) / cols;
    const cellH = (VH - (rows - 1) * GAP) / rows;

    return (
        <div className={className} style={{ width: '100%', ...(height != null ? { height } : { height: '100%', minHeight: VH }) }}>
            <ContentLoader viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} {...SKELETON_PROPS}>
                {Array.from({ length: rows }, (_, r) =>
                    Array.from({ length: cols }, (_, c) => <rect key={`${r}-${c}`} x={c * (cellW + GAP)} y={r * (cellH + GAP)} rx={2} ry={2} width={cellW} height={cellH} />),
                )}
            </ContentLoader>
        </div>
    );
};

export default GridSkeleton;
