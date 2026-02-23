import React, { useEffect, useRef, useState } from 'react';
import { engine } from '../../core/AudioEngine';
import { MasterEffectsPanel } from './MasterEffectsPanel';
import styles from './Inspector.module.css';

export const Inspector: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [rmsVal, setRmsVal] = useState<number>(-100);
    const animationRef = useRef<number>(0);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !canvasRef.current) return;

        const canvas = canvasRef.current;

        const drawLoop = () => {
            // Update RMS state (throttled to UI frame rate implicitly by rAF)
            const meterValue = engine.meter.getValue() as number;
            // Tone.Meter returns values in decibels, typically -100 to 0
            const clampedRms = isFinite(meterValue) ? Math.max(-100, Math.min(0, meterValue)) : -100;
            setRmsVal(clampedRms);

            // Draw FFT
            const fftValues = engine.fft.getValue();
            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            // Draw spectral bg
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, width, height);

            ctx.beginPath();
            if (fftValues.length > 0) {
                // Determine slice width based on standard FFT bins, clamping the view 
                // since highest frequencies are usually not visually interesting
                const activeBins = Math.min(512, fftValues.length);
                const sliceWidth = width / activeBins;
                let x = 0;

                for (let i = 0; i < activeBins; i++) {
                    const db = fftValues[i] as number;
                    // Map db (-100 to 0) to height
                    const y = (db / -100) * height;

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                    x += sliceWidth;
                }
            }

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ec4899'; // accent-secondary
            ctx.stroke();

            animationRef.current = requestAnimationFrame(drawLoop);
        };

        drawLoop();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    // Convert -100 .. 0 dB to 0-100% for the RMS meter bar
    const rmsPercentage = ((rmsVal + 100) / 100) * 100;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Audio Analysis</h3>
                <span className={styles.badge}>LIVE</span>
            </div>

            <div className={styles.section}>
                <div className={styles.labelRow}>
                    <label>Master RMS</label>
                    <span>{rmsVal.toFixed(1)} dB</span>
                </div>
                <div className={styles.meterTrack}>
                    <div
                        className={styles.meterFill}
                        style={{ width: `${rmsPercentage}%`, backgroundColor: rmsVal > -10 ? '#ef4444' : 'var(--accent-primary)' }}
                    />
                </div>
            </div>

            <div className={styles.section}>
                <label>FFT Spectrum (0 - 10kHz)</label>
                <div className={styles.canvasContainer}>
                    <canvas ref={canvasRef} width={300} height={100} className={styles.fftCanvas} />
                </div>
            </div>

            <div className={styles.infoBox}>
                <p><strong>Visual Engine:</strong> Active</p>
                <p><strong>Looper Status:</strong> {engine.isRecording ? 'Recording' : 'Ready'}</p>
                <p>The spectral centroid drives the animation color, while the RMS drives the scale.</p>
            </div>

            <MasterEffectsPanel />
        </div>
    );
};
