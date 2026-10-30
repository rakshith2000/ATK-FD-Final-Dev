import ContentLoader from 'react-content-loader';
import { SKELETON_PROPS, type SkeletonVariantProps } from './primitives';

interface ArticleSkeletonProps extends SkeletonVariantProps {
    VW?: number;
    TITLE_H?: number;
    LINE_H?: number;
    GAP?: number;
}

const ArticleSkeleton: React.FC<ArticleSkeletonProps> = ({ height, className, VW = 400, TITLE_H = 18, LINE_H = 10, GAP = 12, rows = 7 }) => {
    // Generate body line widths based on rows
    const BODY_LINE_WIDTHS = Array.from({ length: rows }, (_, i) => {
        const ratios = [1, 0.95, 1, 0.88, 0.92, 1, 0.6];
        return ratios[i % ratios.length];
    });

    const subtitleY = TITLE_H + GAP;
    const dividerY = subtitleY + LINE_H + GAP;
    const bodyStart = dividerY + GAP;
    const VH = bodyStart + BODY_LINE_WIDTHS.length * (LINE_H + GAP) - GAP;

    return (
        <div className={className} style={{ width: '100%', ...(height != null ? { height } : { height: '100%', minHeight: VH }) }}>
            <ContentLoader viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} {...SKELETON_PROPS}>
                <rect x={0} y={0} rx={4} ry={4} width={VW * 0.55} height={TITLE_H} />
                <rect x={0} y={subtitleY} rx={4} ry={4} width={VW * 0.3} height={LINE_H} />
                <rect x={0} y={dividerY} width={VW} height={1} />
                {BODY_LINE_WIDTHS.map((ratio, i) => (
                    <rect key={i} x={0} y={bodyStart + i * (LINE_H + GAP)} rx={4} ry={4} width={VW * ratio} height={LINE_H} />
                ))}
            </ContentLoader>
        </div>
    );
};

export default ArticleSkeleton;
