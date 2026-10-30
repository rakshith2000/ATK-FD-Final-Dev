import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

interface AnimatedActivityPanelProps {
    active: boolean;
    children: ReactNode;
    className?: string;
}

const AnimatedActivityPanel = ({ active, children, className }: AnimatedActivityPanelProps) => {
    const controls = useAnimationControls();
    const shouldReduceMotion = useReducedMotion();
    const hasMountedRef = useRef(false);

    useEffect(() => {
        if (!active) return;

        if (shouldReduceMotion) {
            controls.set({
                opacity: 1,
                y: 0,
                scale: 1,
            });

            return;
        }

        /**
         * First visible render should not animate from hidden state.
         * This prevents first-load flicker/blank.
         */
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;

            controls.set({
                opacity: 1,
                y: 0,
                scale: 1,
            });

            return;
        }

        controls.set({
            opacity: 0.88,
            y: 5,
            scale: 0.997,
        });

        controls.start({
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: 'spring',
                stiffness: 220,
                damping: 32,
                mass: 0.9,
            },
        });
    }, [active, controls, shouldReduceMotion]);

    return (
        <motion.div
            className={twMerge('h-full origin-center will-change-transform', className)}
            initial={{
                opacity: 1,
                y: 0,
                scale: 1,
            }}
            animate={controls}
        >
            {children}
        </motion.div>
    );
};

export default AnimatedActivityPanel;
