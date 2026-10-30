import React from 'react';
import ContentLoader from 'react-content-loader';
import { SKELETON_PROPS, type SkeletonVariantProps } from './primitives';

const BUBBLE_WIDTHS = [0.6, 0.4, 0.65, 0.35, 0.55] as const;

interface ChatSkeletonProps extends SkeletonVariantProps {
    VW?: number;
    VH?: number;
    PAD?: number;
    AVATAR_R?: number;
    INPUT_H?: number;
    INPUT_GAP?: number;
}

const ChatSkeleton: React.FC<ChatSkeletonProps> = ({ rows = 5, height, className, VW = 400, VH = 300, PAD = 12, AVATAR_R = 12, INPUT_H = 36, INPUT_GAP = 12 }) => {
    const AVATAR_D = AVATAR_R * 2;
    const chatArea = VH - PAD * 2 - INPUT_H - INPUT_GAP;
    const bubbleGap = 10;
    const bubbleH = Math.max(8, (chatArea - (rows - 1) * bubbleGap) / rows);
    const maxBubbleW = VW - PAD * 2 - AVATAR_D - 8;

    return (
        <div className={className} style={{ width: '100%', ...(height != null ? { height } : { height: '100%', minHeight: VH }) }}>
            <ContentLoader viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} {...SKELETON_PROPS}>
                {Array.from({ length: rows }, (_, i) => {
                    const isUser = i % 2 === 1;
                    const bw = maxBubbleW * BUBBLE_WIDTHS[i % BUBBLE_WIDTHS.length];
                    const y = PAD + i * (bubbleH + bubbleGap);
                    const cx = isUser ? VW - PAD - AVATAR_R : PAD + AVATAR_R;
                    const bx = isUser ? VW - PAD - AVATAR_D - 8 - bw : PAD + AVATAR_D + 8;

                    return (
                        <React.Fragment key={i}>
                            <circle cx={cx} cy={y + bubbleH / 2} r={AVATAR_R} />
                            <rect x={bx} y={y} rx={12} ry={12} width={bw} height={bubbleH} />
                        </React.Fragment>
                    );
                })}

                <rect x={PAD} y={VH - PAD - INPUT_H} rx={8} ry={8} width={VW - PAD * 2 - INPUT_H - 8} height={INPUT_H} />
                <circle cx={VW - PAD - INPUT_H / 2} cy={VH - PAD - INPUT_H / 2} r={INPUT_H / 2 - 2} />
            </ContentLoader>
        </div>
    );
};

export default ChatSkeleton;
