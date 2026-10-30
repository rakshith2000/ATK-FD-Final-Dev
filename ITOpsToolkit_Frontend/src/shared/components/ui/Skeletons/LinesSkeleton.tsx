import ContentLoader from 'react-content-loader';
import { SKELETON_PROPS, type SkeletonVariantProps } from './primitives';

interface LinesSkeletonProps extends SkeletonVariantProps {
    VW?: number;
    LINE_H?: number;
    GAP?: number;
}

const LinesSkeleton: React.FC<LinesSkeletonProps> = ({ rows = 3, height, className, VW = 400, LINE_H = 18, GAP = 8 }) => {
    const VH = rows * (LINE_H + GAP) - GAP;

    return (
        <div className={className} style={{ width: '100%', ...(height != null ? { height } : { height: '100%', minHeight: VH }) }}>
            <ContentLoader viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} {...SKELETON_PROPS}>
                {Array.from({ length: rows }, (_, i) => (
                    <rect key={i} x={0} y={i * (LINE_H + GAP)} rx={4} ry={4} width={i === rows - 1 ? VW * 0.6 : VW} height={LINE_H} />
                ))}
            </ContentLoader>
        </div>
    );
};

export default LinesSkeleton;
