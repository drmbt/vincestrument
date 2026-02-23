import React, { useState } from 'react';
import { engine } from '../../core/AudioEngine';
import styles from './MasterEffectsPanel.module.css';

export const MasterEffectsPanel: React.FC = () => {
    const [reverbMix, setReverbMix] = useState(0);
    const [delayMix, setDelayMix] = useState(0);
    const [delayTime, setDelayTime] = useState<string>('8n');

    const handleReverbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setReverbMix(val);
        engine.setReverbAmount(val);
    };

    const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setDelayMix(val);
        engine.setDelayAmount(val);
    };

    const handleDelayTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setDelayTime(val);
        engine.setDelayTime(val);
    };

    return (
        <div className={styles.container}>
            <h3 className={styles.header}>Global Sends</h3>

            <div className={styles.controlGroup}>
                <label className={styles.label}>
                    <span>Reverb</span>
                    <span>{Math.round(reverbMix * 100)}%</span>
                </label>
                <input
                    type="range"
                    className={styles.slider}
                    min="0"
                    max="1"
                    step="0.01"
                    value={reverbMix}
                    onChange={handleReverbChange}
                />
            </div>

            <div className={styles.controlGroup}>
                <label className={styles.label}>
                    <span>Ping-Pong Delay</span>
                    <span>{Math.round(delayMix * 100)}%</span>
                </label>
                <input
                    type="range"
                    className={styles.slider}
                    min="0"
                    max="1"
                    step="0.01"
                    value={delayMix}
                    onChange={handleDelayChange}
                />
            </div>

            <div className={styles.controlGroup}>
                <label className={styles.label}>Delay Time</label>
                <select
                    className={styles.select}
                    value={delayTime}
                    onChange={handleDelayTimeChange}
                >
                    <option value="16n">1/16 Note</option>
                    <option value="8n">1/8 Note</option>
                    <option value="8n.">Dotted 1/8</option>
                    <option value="4n">1/4 Note</option>
                    <option value="2n">1/2 Note</option>
                </select>
            </div>
        </div>
    );
};
