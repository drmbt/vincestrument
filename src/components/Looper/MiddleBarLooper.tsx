import React, { useEffect, useState } from 'react';
import type { LoopEvent } from '../../core/AudioEngine';
import { engine } from '../../core/AudioEngine';
import { Trash2 } from 'lucide-react';
import styles from './MiddleBarLooper.module.css';

export const MiddleBarLooper: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [events, setEvents] = useState<LoopEvent[]>([]);

    useEffect(() => {
        // Register engine callback
        engine.onLoopUpdate = (newEvents) => {
            setEvents(newEvents);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Shift' && !e.repeat && !engine.isRecording) {
                engine.startRecording();
                setIsRecording(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift' && engine.isRecording) {
                engine.stopRecordingAndLoop();
                setIsRecording(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            engine.onLoopUpdate = undefined;
        };
    }, []);

    const handleClear = () => {
        engine.clearLoop();
    };

    return (
        <div className={styles.container}>
            <div className={styles.controls}>
                <div className={styles.statusLed}>
                    <div className={`${styles.led} ${isRecording ? styles.ledRed : (events.length > 0 ? styles.ledGreen : '')}`} />
                    <span className={styles.statusText}>
                        {isRecording ? 'RECORDING (Hold Shift)' : (events.length > 0 ? 'LOOP PLAYING' : 'IDLE (Hold Shift to Rec)')}
                    </span>
                </div>

                <div className={styles.buttons}>
                    <button
                        className={styles.iconBtn}
                        onClick={handleClear}
                        disabled={events.length === 0}
                        title="Clear Loop"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className={styles.timeline}>
                {events.map((ev, i) => {
                    const leftPos = (ev.time / engine.loopLength) * 100;
                    return (
                        <div
                            key={i}
                            className={styles.eventMarker}
                            style={{ left: `${leftPos}%` }}
                            title={`Key: ${ev.key.toUpperCase()} at ${ev.time.toFixed(2)}s`}
                        >
                            {ev.key.toUpperCase()}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
