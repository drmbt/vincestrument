import React, { useEffect, useState } from 'react';
import { engine } from '../../core/AudioEngine';
import styles from './ChannelStrip.module.css';

interface ChannelStripProps {
    keyId: string;
}

export const ChannelStrip: React.FC<ChannelStripProps> = ({ keyId }) => {
    const [volume, setVolume] = useState(0);
    const [pan, setPan] = useState(0);
    const [mute, setMute] = useState(false);
    const [hasSample, setHasSample] = useState(false);

    useEffect(() => {
        const checkState = () => {
            const cell = engine.cells.get(keyId);
            if (cell && cell.url) {
                setHasSample(true);
                setVolume(cell.volume || 0);
                setPan(cell.pan || 0);
                setMute(cell.mute || false);
            } else {
                setHasSample(false);
            }
        };

        checkState();

        // Simple polling for UI update since we don't have a generic observable state system
        const interval = setInterval(checkState, 1000);
        return () => clearInterval(interval);
    }, [keyId]);

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        engine.setCellVolume(keyId, val);
    };

    const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setPan(val);
        engine.setCellPan(keyId, val);
    };

    const toggleMute = () => {
        const next = !mute;
        setMute(next);
        engine.setCellMute(keyId, next);
    };

    if (!hasSample) {
        return (
            <div className={`${styles.container} ${styles.empty}`}>
                <div className={styles.keyLabel}>{keyId.toUpperCase()}</div>
                <div className={styles.emptyText}>EMPTY</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.keyLabel}>{keyId.toUpperCase()}</div>

            <button
                className={`${styles.muteBtn} ${mute ? styles.muted : ''}`}
                onClick={toggleMute}
            >
                M
            </button>

            <div className={styles.controlGroup}>
                <label className={styles.label}>P {pan > 0 ? 'R' : pan < 0 ? 'L' : 'C'}{Math.round(Math.abs(pan) * 100)}</label>
                <input
                    type="range"
                    className={styles.panSlider}
                    min="-1"
                    max="1"
                    step="0.01"
                    value={pan}
                    onChange={handlePanChange}
                />
            </div>

            <div className={styles.controlGroupVertical}>
                <label className={styles.label}>{Math.round(volume)} dB</label>
                <input
                    type="range"
                    className={styles.volSlider}
                    min="-60"
                    max="12"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                />
            </div>
        </div>
    );
};
