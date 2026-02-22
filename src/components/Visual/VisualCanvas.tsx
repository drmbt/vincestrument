import React, { useEffect, useRef } from 'react';
import p5 from 'p5';
import { engine } from '../../core/AudioEngine';
import styles from './VisualCanvas.module.css';

interface VisualEvent {
    key: string;
    rms: number;      // Determines size/scale
    centroid: number; // Determines color/hue
    birth: number;    // Timestamp
    x: number;
    y: number;
}

export const VisualCanvas: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const p5Instance = useRef<p5 | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const sketch = (p: p5) => {
            let events: VisualEvent[] = [];

            p.setup = () => {
                const { clientWidth, clientHeight } = containerRef.current!;
                p.createCanvas(clientWidth, clientHeight);
                p.colorMode(p.HSB, 360, 100, 100, 1);
                p.noStroke();
            };

            p.draw = () => {
                // Clear with a slight trailing effect for motion blur
                p.background(0, 0, 0, 0.2);

                const now = p.millis();

                // Iterate backwards to safely remove dead events
                for (let i = events.length - 1; i >= 0; i--) {
                    const ev = events[i];
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
            (p as any).triggerEvent = (key: string, data: { rms: number, centroid: number }) => {
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
            if (p5Instance.current && (p5Instance.current as any).triggerEvent) {
                (p5Instance.current as any).triggerEvent(key, data);
            }
        };

        return () => {
            p5Instance.current?.remove();
            engine.onTrigger = undefined;
        };
    }, []);

    return <div ref={containerRef} className={styles.canvasWrapper} />;
};
