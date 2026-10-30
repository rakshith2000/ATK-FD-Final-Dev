import React, { useEffect, useId, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

export interface ExactImplodeSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Overall spinner size (e.g., 120, '120px', '6rem') */
    iconSize?: number | string;
    /** Custom message to display below the spinner */
    message?: string;
    /** Whether to render as an absolute overlay container */
    overlay?: boolean;
    /** Primary dot color (used if `colors` array is not provided) */
    color?: string;
    /** Accent dot color for the last bubble (if `colors` array is not provided) */
    accentColor?: string;
    /** Custom array of colors (up to 7) for individual bubbles */
    colors?: string[];
    /** Animation loop speed (e.g., '2.333s', '1.8s') */
    speed?: string;
    /** Accessibility label */
    label?: string;
    /** Additional CSS class names */
    className?: string;
}

// Base structure shared by all Lottie keyframes
interface BaseKeyframe {
    t: number; // Frame time
    s: number[]; // Value array (e.g., [x, y] or scale)
    o?: { x: number; y: number }; // Out-ease control point
    i?: { x: number; y: number }; // In-ease control point
}

// Spatial position keyframe (includes spatial tangents)
interface PositionKeyframe extends BaseKeyframe {
    to?: number[]; // Tangent out [x, y]
    ti?: number[]; // Tangent in [x, y]
}

// Scale keyframe type alias
type ScaleKeyframe = BaseKeyframe;

// Combined union type
type LottieKeyframe = PositionKeyframe | ScaleKeyframe;

// 1:1 Raw Layer Keyframe Data extracted directly from loading.json
const LOTTIE_DATA = {
    totalFrames: 35,
    layers: [
        {
            id: 1,
            st: -30,
            color: [0.5725, 0.6549, 0.9961],
            scale: [
                { t: 0, s: [156, 156], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 18, s: [77, 77], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 29, s: [156, 156] },
            ],
            pos: [
                { t: -30, s: [83.75, 48.625], to: [0, 0], ti: [18.875, -42.25], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: -21.479, s: [34, 71.625], to: [-9.75, 36.875], ti: [-16.625, 3], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: -10.488, s: [81.625, 121.625], to: [21.875, -3], ti: [-1.807, 7.548], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: -2.5, s: [120.235, 80.447], to: [0.728, -0.455], ti: [3.232, 9.475], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: -1.75, s: [116.741, 60.96], to: [-1.218, -2.267], ti: [4.008, 3.359], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 0, s: [108.445, 51.295], to: [-8.988, -7.532], ti: [8.126, -26.972], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 6, s: [77.625, 66.625], to: [-7.747, 25.713], ti: [-15.243, -0.874], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 17, s: [101.172, 99.32], to: [7.877, 0.452], ti: [-2.21, 4.855], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 20, s: [117.902, 89.411], to: [2.21, -4.855], ti: [10.452, 7.914], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 33.999, s: [109.223, 51.184] },
            ],
        },
        {
            id: 2,
            st: -25,
            color: [0.5, 0.6, 1],
            scale: [
                { t: 0, s: [157, 157], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 19, s: [60, 60], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 21, s: [87, 87], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 30, s: [157, 157] },
            ],
            pos: [
                { t: -25, s: [83.75, 48.625], to: [0, 0], ti: [18.875, -42.25], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: -16.635, s: [34, 71.625], to: [-9.75, 36.875], ti: [-16.625, 3], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: -5.846, s: [81.625, 121.625], to: [21.875, -3], ti: [-3.938, 4.981], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 0, s: [116.818, 97.643], to: [7.487, -2.471], ti: [1.448, 10.336], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 3.5, s: [119.676, 71.728], to: [-4.426, -31.603], ti: [7.021, -22.847], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 15, s: [77.153, 69.218], to: [-1.703, 8.917], ti: [-11.713, -3.397], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 20, s: [94.838, 95.258], to: [11.713, 3.397], ti: [-7.604, 1.315], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 34, s: [116.818, 97.643] },
            ],
        },
        {
            id: 3,
            st: -19,
            color: [0.52, 0.616, 1],
            scale: [
                { t: 0, s: [152, 152], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 13, s: [66, 66], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 18, s: [69.881, 69.881], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 23, s: [85.762, 85.762], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 31, s: [152, 152] },
            ],
            pos: [
                { t: -19, s: [83.75, 48.625], to: [0, 0], ti: [18.875, -42.25], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: -10.622, s: [34, 71.625], to: [-9.75, 36.875], ti: [-16.625, 3], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 0.184, s: [81.625, 121.625], to: [21.875, -3], ti: [-5.425, 10.832], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 5.5, s: [112.497, 100.131], to: [4.605, -6.562], ti: [0.423, 9.644], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 9.25, s: [116.834, 76.892], to: [-4.613, -17.447], ti: [10.415, -14.592], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 14, s: [76.161, 68.803], to: [-3.28, 5.14], ti: [0.96, -7.982], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 20, s: [72.875, 80.766], to: [-0.96, 7.982], ti: [-0.088, -0.088], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 25, s: [79.947, 108.964], to: [0.088, 0.088], ti: [1.198, -8.571], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 34.184, s: [81.625, 121.625] },
            ],
        },
        {
            id: 4,
            st: -13,
            color: [0.54, 0.632, 1],
            scale: [
                { t: -1, s: [131, 131], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 8, s: [144, 144], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 23, s: [62, 62], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 32, s: [144, 144] },
            ],
            pos: [
                { t: -13, s: [83.75, 48.625], to: [0, 0], ti: [18.875, -42.25], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: -4.747, s: [34, 71.625], to: [-8.821, 23.25], ti: [-3.181, -5.276], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 1, s: [42.831, 111.983], to: [15.363, 10.079], ti: [-16.482, 1.429], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 7.013, s: [81.625, 121.625], to: [21.875, -3], ti: [-2.365, 8.127], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 11.75, s: [104.468, 103.414], to: [2.365, -8.127], ti: [17.16, 1.125], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 17, s: [87.308, 81.463], to: [-1.364, -0.344], ti: [1.294, 0.259], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 22, s: [68.796, 85.475], to: [-6.444, 5.467], ti: [6.853, -7.903], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 30, s: [50.911, 100.769], to: [-0.317, 2.526], ti: [-1.229, -2.647], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 34, s: [45.403, 109.554] },
            ],
        },
        {
            id: 5,
            st: -11,
            color: [0.38, 0.504, 1],
            scale: [
                { t: -3, s: [122, 122], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 3, s: [147.263, 147.263], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 16, s: [66, 66], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 23, s: [66, 66], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 33, s: [122, 122] },
            ],
            pos: [
                { t: -9, s: [83.75, 48.625], to: [0, 0], ti: [18.875, -42.25], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 0.08, s: [34.616, 71.647], to: [-9.75, 36.875], ti: [-8.124, -3.995], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 9.25, s: [62.999, 119.368], to: [8.684, 3.343], ti: [-2.474, 7.301], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 12.45, s: [82.18, 104.422], to: [10.083, -18.122], ti: [8.826, 8.233], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 17, s: [76.851, 70.747], to: [-7.482, -2.696], ti: [9.577, -2.822], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 30, s: [49.837, 74.087], to: [-5.344, 0.766], ti: [3.902, 0.829], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 34, s: [35.284, 72.755] },
            ],
        },
        {
            id: 6,
            st: -4,
            color: [0.2, 0.36, 1],
            scale: [
                { t: 0, s: [100, 100], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 5, s: [140, 140], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 13, s: [82.103, 82.103], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 23, s: [63.626, 63.626], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 34, s: [100, 100] },
            ],
            pos: [
                { t: -4, s: [83.75, 48.625], to: [0, 0], ti: [9.467, 1.12], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 0, s: [54.49, 48.276], to: [-4.311, 1.842], ti: [4.875, -15.107], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 4.564, s: [34, 71.625], to: [-9.75, 36.875], ti: [-14.054, 9.143], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 13.776, s: [66.196, 107.196], to: [12.304, -9.571], ti: [5.236, 12.574], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 19, s: [76.286, 75.321], to: [-5.527, -12.334], ti: [5.374, 3.065], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 30, s: [63.89, 57.306], to: [-2.944, -1.679], ti: [3.35, 0.396], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 34, s: [51.061, 50.99] },
            ],
        },
        {
            id: 7,
            st: 0,
            color: [0.2, 0.36, 1],
            scale: [
                { t: 0, s: [81, 81], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 5, s: [140, 140], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 13, s: [82.939, 82.939], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 19, s: [52.592, 52.592], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 35, s: [100, 100] },
            ],
            pos: [
                { t: 0, s: [76.953, 41.251], to: [0, 0], ti: [10.088, -3.188], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 4, s: [54.183, 44.883], to: [-8.194, 3.806], ti: [3.95, -14.771], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 8.707, s: [34, 71.625], to: [-9.75, 36.875], ti: [-11.804, 4.482], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 16.934, s: [67.224, 102.636], to: [11.804, -4.482], ti: [-0.503, 8.62], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 21, s: [81.636, 78.599], to: [0.503, -8.62], ti: [0.832, 7.81], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 30, s: [84.306, 53.658], to: [-0.923, -8.671], ti: [0, 0], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 34, s: [76.814, 41.251], to: [0, 0], ti: [-10.104, -3.451], o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } },
                { t: 38, s: [55.061, 46.99] },
            ],
        },
    ],
};

// Precise Cubic-Bezier Solver for Lottie Keyframe curves
function solveBezier(p0: number, p1: number, p2: number, p3: number, t: number) {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

// Evaluates layer value (position or scale) at current frame
function evaluateKeyframes(keyframes: LottieKeyframe[], frame: number, isPosition: boolean) {
    if (!keyframes || keyframes.length === 0) return [0, 0];
    if (frame <= keyframes[0].t) return keyframes[0].s;
    if (frame >= keyframes[keyframes.length - 1].t) return keyframes[keyframes.length - 1].s;

    for (let i = 0; i < keyframes.length - 1; i++) {
        const k1 = keyframes[i];
        const k2 = keyframes[i + 1];

        if (frame >= k1.t && frame <= k2.t) {
            const linearProgress = (frame - k1.t) / (k2.t - k1.t);
            const easeT = solveBezier(0, k1.o ? k1.o.y : 0.167, k1.i ? k1.i.y : 0.833, 1, linearProgress);

            if (isPosition) {
                // Cast or safely access position-specific spatial tangents
                const posKeyframe = k1 as PositionKeyframe;
                const p0 = posKeyframe.s;
                const p3 = k2.s;
                const to = posKeyframe.to || [0, 0];
                const ti = posKeyframe.ti || [0, 0];

                const p1 = [p0[0] + to[0], p0[1] + to[1]];
                const p2 = [p3[0] + ti[0], p3[1] + ti[1]];

                const x = solveBezier(p0[0], p1[0], p2[0], p3[0], easeT);
                const y = solveBezier(p0[1], p1[1], p2[1], p3[1], easeT);
                return [x, y];
            } else {
                const s0 = k1.s;
                const s1 = k2.s;
                const sx = s0[0] + (s1[0] - s0[0]) * easeT;
                const sy = s0[1] + (s1[1] - s0[1]) * easeT;
                return [sx, sy];
            }
        }
    }

    return keyframes[0].s;
}

export const LoadingPlaceholder: React.FC<ExactImplodeSpinnerProps> = ({
    iconSize = 80,
    message = 'Loading',
    overlay = false,
    color,
    accentColor,
    colors,
    speed = '2.333s',
    label = 'Loading...',
    className,
    style,
    ...props
}) => {
    const formattedSize = typeof iconSize === 'number' ? `${iconSize}px` : iconSize;
    const svgRef = useRef<SVGSVGElement | null>(null);
    const instanceId = useId().replace(/:/g, '');

    // Parse numerical duration in ms from speed prop
    const parsedSpeedMs = parseFloat(speed) * (speed.endsWith('ms') ? 1 : 1000) || 2333;

    // Gradient definitions corresponding to requested blue shades
    const defaultBlueGradients = [
        { start: '#4c97f4', end: '#3b62cc' }, // Bubble 1
        { start: '#60a5fa', end: '#2564eb' }, // Bubble 2
        { start: '#60a5fa', end: '#2563eb' }, // Bubble 3
        { start: '#3b62cc', end: '#3b62cc' }, // Bubble 4
        { start: '#4c97f4', end: '#2563eb' }, // Bubble 5
        { start: '#3b62cc', end: '#2564eb' }, // Bubble 6
        { start: '#2563eb', end: '#3b62cc' }, // Bubble 7
    ];

    const getBubbleFill = (index: number): string => {
        if (colors && colors.length > 0) {
            return colors[index % colors.length];
        }
        if (color || accentColor) {
            if (index === 6 && accentColor) return accentColor;
            if (color) return color;
        }
        return `url(#blue-gradient-${instanceId}-${index})`;
    };

    useEffect(() => {
        let animFrameId: number;
        let startTime: number | null = null;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = (elapsed % parsedSpeedMs) / parsedSpeedMs;
            const currentFrame = progress * LOTTIE_DATA.totalFrames;

            if (svgRef.current) {
                LOTTIE_DATA.layers.forEach((layer, idx) => {
                    const group = svgRef.current?.querySelector(`#bubble-layer-${instanceId}-${idx}`);
                    if (group) {
                        const pos = evaluateKeyframes(layer.pos, currentFrame, true);
                        const scale = evaluateKeyframes(layer.scale, currentFrame, false);

                        const scaleX = scale[0] / 100;
                        const scaleY = scale[1] / 100;

                        // Anchor center [-40.916, -41.58] adjustment from Lottie asset matrix
                        group.setAttribute('transform', `translate(${pos[0]}, ${pos[1]}) scale(${scaleX}, ${scaleY}) translate(${-40.916}, ${-41.58})`);
                    }
                });
            }

            animFrameId = requestAnimationFrame(animate);
        };

        animFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animFrameId);
    }, [parsedSpeedMs, instanceId]);

    return (
        <div
            className={twMerge(
                'flex flex-col items-center justify-center gap-4 p-2',
                overlay ? 'absolute inset-0 z-10 bg-white/80 backdrop-blur-[2px] rounded w-full h-full' : 'w-full h-full',
                className,
            )}
            role="status"
            aria-label={label}
            style={style}
            {...props}
        >
            <div style={{ width: formattedSize, height: formattedSize }}>
                <svg ref={svgRef} viewBox="0 0 150 150" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        {defaultBlueGradients.map((grad, idx) => (
                            <linearGradient key={idx} id={`blue-gradient-${instanceId}-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={grad.start} />
                                <stop offset="100%" stopColor={grad.end} />
                            </linearGradient>
                        ))}
                    </defs>

                    {LOTTIE_DATA.layers.map((layer, idx) => (
                        <g key={layer.id} id={`bubble-layer-${instanceId}-${idx}`}>
                            <path
                                fill={getBubbleFill(idx)}
                                d="M40.916,34.697 C37.115,34.697 34.033,37.779 34.033,41.58 C34.033,45.381 37.115,48.463 40.916,48.463 C44.717,48.463 47.799,45.381 47.799,41.58 C47.799,37.779 44.717,34.697 40.916,34.697 Z"
                            />
                        </g>
                    ))}
                </svg>
            </div>

            {message && <p className="m-0 text-xs font-medium text-gray-500">{message}</p>}
        </div>
    );
};

export default LoadingPlaceholder;
