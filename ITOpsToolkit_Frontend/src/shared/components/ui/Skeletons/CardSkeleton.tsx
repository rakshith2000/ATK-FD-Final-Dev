import ContentLoader from 'react-content-loader';
import { SKELETON_PROPS, type SkeletonVariantProps } from './primitives';

interface CardSkeletonProps extends SkeletonVariantProps {
    VW?: number;
    VH?: number;
    LINE_H?: number;
    GAP?: number;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({ height, className, VW = 400, VH = 240, LINE_H = 12, GAP = 10 }) => {
    const imgH = VH * 0.5;
    const textStart = imgH + GAP * 2;

    return (
        <div className={className} style={{ width: '100%', ...(height != null ? { height } : { height: '100%', minHeight: VH }) }}>
            <ContentLoader viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} {...SKELETON_PROPS}>
                <rect x={0} y={0} rx={8} ry={8} width={VW} height={imgH} />
                <rect x={0} y={textStart} rx={4} ry={4} width={VW * 0.7} height={LINE_H} />
                <rect x={0} y={textStart + LINE_H + GAP} rx={4} ry={4} width={VW * 0.9} height={LINE_H} />
                <rect x={0} y={textStart + (LINE_H + GAP) * 2} rx={4} ry={4} width={VW * 0.4} height={LINE_H} />
            </ContentLoader>
        </div>
    );
};

export default CardSkeleton;
