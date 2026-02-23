import React, { useState, useEffect } from 'react';
import { engine } from '../../core/AudioEngine';
import type { SampleCell } from '../../core/AudioEngine';
import styles from './CellEditor.module.css';

interface CellEditorProps {
    activeKey: string;
}

export const CellEditor: React.FC<CellEditorProps> = ({ activeKey }) => {
    const [cellState, setCellState] = useState<SampleCell | null>(null);

    useEffect(() => {
        // Poll or get the cell state
        const cell = engine.cells.get(activeKey);
        if (cell) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCellState({ ...cell });
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCellState(null);
        }
    }
        , [activeKey]);

    if (!cellState) {
        return (
            <div className={styles.containerEmpty}>
                <p>No sample loaded for {activeKey.toUpperCase()}</p>
                <p className={styles.subtext}>Drag and drop an audio file onto the cell</p>
            </div>
        );
    }

    const handleModeChange = (mode: 'sampler' | 'granular') => {
        engine.updateCellConfig(activeKey, { mode });
        setCellState(prev => prev ? { ...prev, mode } : null);
    };

    const handleParamChange = (param: keyof SampleCell, value: any) => {
        engine.updateCellConfig(activeKey, { [param]: value });
        setCellState(prev => prev ? { ...prev, [param]: value } : null);
    };

    const GlobalControls = () => (
        <>
            <div className={styles.controlGroup}>
                <label>Transpose</label>
                <input
                    type="range"
                    min="-24"
                    max="24"
                    step="1"
                    value={cellState.transpose ?? 0}
                    onChange={(e) => handleParamChange('transpose', parseInt(e.target.value, 10))}
                />
                <span>{cellState.transpose ?? 0} st</span>
            </div>
            <div className={styles.controlGroup}>
                <label>Piano Mode</label>
                <input
                    type="checkbox"
                    checked={cellState.pianoMode ?? false}
                    onChange={(e) => handleParamChange('pianoMode', e.target.checked)}
                />
                <span>{cellState.pianoMode ? 'On' : 'Off'}</span>
            </div>
        </>
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>{activeKey.toUpperCase()} Engine</h3>
                <div className={styles.modeToggle}>
                    <button
                        className={`${styles.toggleBtn} ${cellState.mode === 'sampler' ? styles.active : ''}`}
                        onClick={() => handleModeChange('sampler')}
                    >
                        Sampler
                    </button>
                    <button
                        className={`${styles.toggleBtn} ${cellState.mode === 'granular' ? styles.active : ''}`}
                        onClick={() => handleModeChange('granular')}
                    >
                        Granular
                    </button>
                </div>
            </div>

            <div className={styles.controls}>
                {cellState.mode === 'sampler' ? (
                    <div className={styles.panel}>
                        <GlobalControls />
                    </div>
                ) : (
                    <div className={styles.panel}>
                        <GlobalControls />
                        <div className={styles.controlGroup}>
                            <label>Grain Size</label>
                            <input
                                type="range"
                                min="0.01"
                                max="0.5"
                                step="0.01"
                                value={cellState.grainSize}
                                onChange={(e) => handleParamChange('grainSize', parseFloat(e.target.value))}
                            />
                            <span>{cellState.grainSize}s</span>
                        </div>
                        <div className={styles.controlGroup}>
                            <label>Overlap</label>
                            <input
                                type="range"
                                min="0.01"
                                max="0.5"
                                step="0.01"
                                value={cellState.overlap}
                                onChange={(e) => handleParamChange('overlap', parseFloat(e.target.value))}
                            />
                            <span>{cellState.overlap}s</span>
                        </div>
                        <div className={styles.controlGroup}>
                            <label>Playback Rate</label>
                            <input
                                type="range"
                                min="0.1"
                                max="4"
                                step="0.1"
                                value={cellState.playbackRate}
                                onChange={(e) => handleParamChange('playbackRate', parseFloat(e.target.value))}
                            />
                            <span>{cellState.playbackRate}x</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
