import React, { useEffect, useRef, useState } from 'react';
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

type VisualMode = 'particles' | 'oscilloscope' | 'spectrum';

export const VisualCanvas: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const p5Instance = useRef<p5 | null>(null);
    const [mode, setMode] = useState<VisualMode>('particles');
    const modeRef = useRef<VisualMode>(mode);

    useEffect(() => {
        modeRef.current = mode;
    }, [mode]);

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
                const currentMode = modeRef.current;

                if (currentMode === 'particles') {
                    // Clear with a slight trailing effect for motion blur
                    p.background(0, 0, 0, 0.2);

                    const now = p.millis();

                    // --- Sustained Background Visuals ---
                    const meterValue = engine.meter.getValue() as number;
                    const currentRms = isFinite(meterValue) ? Math.max(-100, Math.min(0, meterValue)) : -100;

                    const activityLevel = p.map(currentRms, -60, 0, 0, 1, true);
                    const speedMult = 1 + (activityLevel * 10);
                    const sizeMult = 1 + (activityLevel * 5);

                    p.fill(250, 40, 50, 0.3 + (activityLevel * 0.4));
                    p.noStroke();
                    for (const pt of particles) {
                        pt.x += pt.vx * speedMult;
                        pt.y += pt.vy * speedMult;

                        if (pt.x > p.width) pt.x = 0;
                        if (pt.x < 0) pt.x = p.width;
                        if (pt.y > p.height) pt.y = 0;
                        if (pt.y < 0) pt.y = p.height;

                        p.circle(pt.x, pt.y, pt.baseSize * sizeMult);
                    }
                } else if (currentMode === 'oscilloscope') {
                    p.background(0);
                    const values = engine.waveform.getValue() as Float32Array;
                    p.stroke(200, 80, 100);
                    p.strokeWeight(2);
                    p.noFill();
                    p.beginShape();
                    // Draw less points for performance or aliasing, skip every other
                    for (let i = 0; i < values.length; i += 4) {
                        const x = p.map(i, 0, values.length, 0, p.width);
                        const y = p.map(values[i], -1, 1, p.height, 0);
                        p.vertex(x, y);
                    }
                    p.endShape();
                } else if (currentMode === 'spectrum') {
                    p.background(0);
                    const values = engine.fft.getValue() as Float32Array;
                    p.noStroke();
                    // values is usually 1024 bins, we map broadly
                    const binCount = Math.min(values.length, 128);
                    const barWidth = p.width / binCount;

                    for (let i = 0; i < binCount; i++) {
                        const valDb = isFinite(values[i]) ? Math.max(-100, Math.min(0, values[i])) : -100;
                        const val = p.map(valDb, -100, 0, 0, 1, true);
                        const h = val * p.height;
                        const hue = p.map(i, 0, binCount, 260, 360); // Blue to Red spectrum

                        p.fill(hue, 80, 100);
                        p.rect(i * barWidth, p.height - h, barWidth - 1, h, 2, 2, 0, 0);
                    }
                }

                if (currentMode === 'particles') {
                    const now = p.millis();
                    // --- Transient Event Visuals (draw on top of all modes) ---
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

    return (
        <div ref={containerRef} className={styles.canvasWrapper}>
            <div className={styles.controls}>
                <button
                    className={`${styles.modeButton} ${mode === 'particles' ? styles.active : ''}`}
                    onClick={() => setMode('particles')}
                >
                    Particles
                </button>
                <button
                    className={`${styles.modeButton} ${mode === 'oscilloscope' ? styles.active : ''}`}
                    onClick={() => setMode('oscilloscope')}
                >
                    Oscilloscope
                </button>
                <button
                    className={`${styles.modeButton} ${mode === 'spectrum' ? styles.active : ''}`}
                    onClick={() => setMode('spectrum')}
                >
                    Spectrum
                </button>
            </div>
        </div>
    );
};
