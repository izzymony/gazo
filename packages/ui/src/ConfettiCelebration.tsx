"use client";
import React, { useEffect } from 'react';

interface ConfettiProps {
    trigger: boolean;
    onComplete?: () => void;
    duration?: number;
    particleCount?: number;
}

const ConfettiCelebration: React.FC<ConfettiProps> = ({
    trigger,
    onComplete,
    duration = 2000, // ✅ UPDATED: 2 seconds for punchy celebration
    particleCount = 80 // This will be used for intensity
}) => {

    useEffect(() => {
        if (trigger && typeof window !== 'undefined') {
            import('canvas-confetti').then((confetti) => {
                // eslint-disable-next-line no-restricted-syntax -- canvas-confetti takes literal hex colours (canvas has no CSS-var support)
                const brandColors = ['#FE2C55', '#10B981', '#3B82F6', '#F59E0B'];

                // Single clean burst from center — respects particleCount prop
                confetti.default({
                    particleCount,
                    spread: 55,
                    startVelocity: 30,
                    origin: { x: 0.5, y: 0.5 },
                    colors: brandColors,
                    gravity: 1,
                    scalar: 0.9,
                    ticks: 120,
                    disableForReducedMotion: true,
                });

                const cleanup = setTimeout(() => {
                    onComplete?.();
                }, duration);

                return () => clearTimeout(cleanup);
            }).catch((error) => {
                console.warn('Canvas-confetti failed to load:', error);
                onComplete?.();
            });
        }
    }, [trigger, duration, particleCount, onComplete]);

    // This component doesn't render anything - canvas-confetti draws directly to screen
    return null;
};

export default ConfettiCelebration;