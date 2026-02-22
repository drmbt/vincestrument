import React, { useEffect, useRef } from 'react';
import p5 from 'p5';
import { engine } from '../../core/AudioEngine';
import styles from './VisualCanvas.module.css';

interface VisualEvent {
    key: string;
    rms: number;
    centroid: number;
    birth: number;
    x: number;
    y: number;
}

export const VisualCanvas: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const p5Instance = useRef<p5 | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const sketch = (p: p5) => {
            // List of transient events { birth: number, x, y, rms, centroid }
            const events: VisualEvent[] = [];

            // Sustained particles
            const particles: { x: number, y: number, vx: number, vy: number, baseSize: number }[] = [];
            const numParticles = 50;

            p.setup = () => {
                const { clientWidth, clientHeight } = containerRef.current!;
                p.createCanvas(clientWidth, clientHeight);
                p.colorMode(p.HSB, 360, 100, 100, 1);
                p.noStroke();

                // Initialize particles
                for (let i = 0; i < numParticles; i++) {
                    particles.push({
                        x: p.random(p.width),
                        y: p.random(p.height),
                        vx: p.random(-0.5, 0.5),
                        vy: p.random(-0.5, 0.5),
                        baseSize: p.random(2, 8)
                    });
                }
            };

            p.draw = () => {
                // Clear with a slight trailing effect for motion blur
                p.background(0, 0, 0, 0.2);

                const now = p.millis();

                // --- Sustained Background Visuals ---
                // Get current audio metrics for continuous modulation
                const meterValue = engine.meter.getValue() as number;
                const currentRms = isFinite(meterValue) ? Math.max(-100, Math.min(0, meterValue)) : -100;

                // Map RMS to particle speed and size multiplier (-100 == quiet, 0 == loud)
                const activityLevel = p.map(currentRms, -60, 0, 0, 1, true);
                const speedMult = 1 + (activityLevel * 10);
                const sizeMult = 1 + (activityLevel * 5);

                // Draw particles
                p.fill(250, 40, 50, 0.3 + (activityLevel * 0.4)); // Blueish ambient particles
                for (const pt of particles) {
                    pt.x += pt.vx * speedMult;
                    pt.y += pt.vy * speedMult;

                    // Wrap edges
                    if (pt.x > p.width) pt.x = 0;
                    if (pt.x < 0) pt.x = p.width;
                    if (pt.y > p.height) pt.y = 0;
                    if (pt.y < 0) pt.y = p.height;

                    p.circle(pt.x, pt.y, pt.baseSize * sizeMult);
                }

                // --- Transient Event Visuals ---
                // Iterate backwards to safely remove dead events
                for (let i = events.length - 1; i >= 0; i--) {
                    const ev = events[i]; // ev is now correctly typed as VisualEvent
                    const age = now - ev.birth;
                    const lifespan = 600; // ms

                    if (age > lifespan) {
                        events.splice(i, 1);
                        continue;
                    }

                    // Progress 0.0 to 1.0
                    const progress = age / lifespan;

                    // Size driven by initial RMS, scaling up then shrinking
                    const maxRadius = p.map(ev.rms, -60, 0, 50, 400, true);
                    const currentRadius = maxRadius * p.sin(progress * p.PI);

                    // Hue driven by spectral centroid (roughly 0 to 10000 Hz mapping)
                    const hue = p.map(ev.centroid, 0, 8000, 0, 360, true);

                    // Opacity fades out
                    const alpha = p.map(progress, 0, 1, 0.8, 0);

                    p.fill(hue, 80, 90, alpha);

                    // Simple shape for now - expanding circles
                    // Patatap has many shapes, we will start with circles for transient action
                    p.circle(ev.x, ev.y, currentRadius);
                }
            };

            p.windowResized = () => {
                if (containerRef.current) {
                    p.resizeCanvas(containerRef.current.clientWidth, containerRef.current.clientHeight);
                }
            };

            // Expose a method to add events
            (p as unknown as { triggerEvent: (key: string, data: { rms: number, centroid: number }) => void }).triggerEvent = (key: string, data: { rms: number, centroid: number }) => {
                events.push({
                    key,
                    rms: data.rms,
                    centroid: data.centroid,
                    birth: p.millis(),
                    x: p.random(p.width * 0.1, p.width * 0.9),
                    y: p.random(p.height * 0.1, p.height * 0.9)
                });
            };
        };

        p5Instance.current = new p5(sketch, containerRef.current);

        // Register audio engine callback
        engine.onTrigger = (key, data) => {
            const pInst = p5Instance.current as unknown as { triggerEvent?: (key: string, data: { rms: number, centroid: number }) => void };
            if (pInst && pInst.triggerEvent) {
                pInst.triggerEvent(key, data);
            }
        };

        return () => {
            p5Instance.current?.remove();
            engine.onTrigger = undefined;
        };
    }, []);

    return <div ref={containerRef} className={styles.canvasWrapper} />;
};
