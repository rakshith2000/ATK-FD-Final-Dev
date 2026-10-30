export const SKELETON_PROPS = { speed: 1.8, backgroundColor: '#e5e7eb', foregroundColor: '#f3f4f6' } as const;

export interface SkeletonVariantProps {
    rows?: number;
    cols?: number;
    height?: number | string;
    className?: string;
}
