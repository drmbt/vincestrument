import React, { useEffect, useRef, useState } from 'react';
import { engine, type SampleCell } from '../../core/AudioEngine';
import styles from './SampleEditor.module.css';

interface SampleEditorProps {
    activeKey: string;
}

export const SampleEditor: React.FC<SampleEditorProps> = ({ activeKey }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [cell, setCell] = useState<SampleCell | null>(null);
    const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);

    // Poll for cell updates easily
    useEffect(() => {
        const interval = setInterval(() => {
            const currentCell = engine.cells.get(activeKey);
            if (currentCell) {
                // simple state update to trigger render
                setCell({ ...currentCell });
            } else {
                setCell(null);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [activeKey]);

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current || !cell || !cell.player || !cell.player.loaded) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fit canvas to container
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;

        const buffer = cell.player.buffer;
        if (!buffer) return;

        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / canvas.width);
        const amp = canvas.height / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw waveform
        ctx.beginPath();
        for (let i = 0; i < canvas.width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[i * step + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.moveTo(i, (1 + min) * amp);
            ctx.lineTo(i, (1 + max) * amp);
        }
        ctx.strokeStyle = '#3b82f6'; // primary blue
        ctx.stroke();

        // Draw inactive regions
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        const startX = (cell.trimStart / buffer.duration) * canvas.width;
        const endX = (cell.trimEnd / buffer.duration) * canvas.width;

        // fade out before start
        ctx.fillRect(0, 0, startX, canvas.height);
        // fade out after end
        ctx.fillRect(endX, 0, canvas.width - endX, canvas.height);

        // Draw markers
        ctx.strokeStyle = '#ef4444'; // red marker for start
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX, canvas.height);
        ctx.stroke();

        ctx.strokeStyle = '#ec4899'; // pink marker for end
        ctx.beginPath();
        ctx.moveTo(endX, 0);
        ctx.lineTo(endX, canvas.height);
        ctx.stroke();

    }, [cell, activeKey]);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!cell || !cell.player || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const duration = cell.player.buffer.duration;
        const clickTime = (x / rect.width) * duration;

        // Check which marker we are closer to
        const distToStart = Math.abs(clickTime - cell.trimStart);
        const distToEnd = Math.abs(clickTime - cell.trimEnd);

        // Simple threshold of 5% of duration
        const threshold = duration * 0.05;

        if (distToStart < threshold && distToStart <= distToEnd) {
            setIsDragging('start');
        } else if (distToEnd < threshold) {
            setIsDragging('end');
        } else {
            // Clicked somewhere else, maybe just preview it
            engine.playKey(activeKey);
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging || !cell || !cell.player || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        // constraint x between 0 and rect.width
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const duration = cell.player.buffer.duration;
        let newTime = (x / rect.width) * duration;

        if (isDragging === 'start') {
            // Can't push start past end
            newTime = Math.min(newTime, cell.trimEnd - 0.01);
            engine.updateCellConfig(activeKey, { trimStart: newTime });
        } else {
            // Can't push end before start
            newTime = Math.max(newTime, cell.trimStart + 0.01);
            engine.updateCellConfig(activeKey, { trimEnd: newTime });
        }
    };

    const handlePointerUp = () => {
        setIsDragging(null);
    };

    if (!cell || !cell.player || !cell.player.loaded) {
        return <div className={styles.empty}>Select a key to edit its sample, or drag a sample onto a key.</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>{activeKey.toUpperCase()} Sample Editor</h3>
                <span className={styles.info}>
                    {cell.player.buffer.duration.toFixed(2)}s
                </span>
            </div>

            <div
                className={styles.waveformContainer}
                ref={containerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{ cursor: isDragging ? 'ew-resize' : 'crosshair' }}
            >
                <canvas ref={canvasRef} className={styles.canvas} />
                <div className={styles.labels}>
                    <span>Start: {cell.trimStart.toFixed(3)}s</span>
                    <span>End: {cell.trimEnd.toFixed(3)}s</span>
                </div>
            </div>

            <div className={styles.instructions}>
                Drag the <span style={{ color: '#ef4444' }}>red</span> and <span style={{ color: '#ec4899' }}>pink</span> lines to adjust playback boundaries. Click anywhere else on the waveform to preview.
            </div>
        </div>
    );
};
