import React from 'react';
import ContentLoader from 'react-content-loader';
import { SKELETON_PROPS, type SkeletonVariantProps } from './primitives';

interface FormSkeletonProps extends SkeletonVariantProps {
    VW?: number;
    BTN_H?: number;
    SECTION_GAP?: number;
    LABEL_H?: number;
    FIELD_GAP?: number;
}

const FormSkeleton: React.FC<FormSkeletonProps> = ({ rows = 3, height, className, VW = 400, BTN_H = 36, SECTION_GAP = 12, LABEL_H = 10, FIELD_GAP = 8 }) => {
    const VH = rows * 68 + 44;
    const fieldArea = VH - BTN_H - SECTION_GAP;
    const rowH = fieldArea / rows;
    const inputH = Math.min(rowH * 0.5, 36);

    return (
        <div className={className} style={{ width: '100%', ...(height != null ? { height } : { height: '100%', minHeight: VH }) }}>
            <ContentLoader viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} {...SKELETON_PROPS}>
                {Array.from({ length: rows }, (_, i) => {
                    const y = i * rowH;
                    return (
                        <React.Fragment key={i}>
                            <rect x={0} y={y} rx={3} ry={3} width={VW * 0.25} height={LABEL_H} />
                            <rect x={0} y={y + LABEL_H + FIELD_GAP} rx={6} ry={6} width={VW} height={inputH} />
                        </React.Fragment>
                    );
                })}
                <rect x={0} y={fieldArea + SECTION_GAP / 2} rx={6} ry={6} width={VW * 0.3} height={BTN_H} />
            </ContentLoader>
        </div>
    );
};

export default FormSkeleton;
