import React, { useEffect, useState } from 'react';
import type { DragEvent } from 'react';
import { engine } from '../../core/AudioEngine';
import { CellEditor } from './CellEditor';
import { SampleEditor } from './SampleEditor';
import { MixerPanel } from '../Mixer/MixerPanel';
import styles from './KeyboardMap.module.css';

// 3 rows x 8 columns setup similar to Patatap's grid layout
const ROW_1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i'];
const ROW_2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'];
const ROW_3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ','];
const KEYS = [...ROW_1, ...ROW_2, ...ROW_3];

interface KeyboardMapProps {
    onKeyTriggered?: (keyId: string) => void;
}

export const KeyboardMap: React.FC<KeyboardMapProps> = ({ onKeyTriggered }) => {
    const [activeTab, setActiveTab] = useState<'keyboard' | 'editor' | 'mixer'>('keyboard');
    const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
    const [selectedKey, setSelectedKey] = useState<string>('q');
    const [loadedKeys, setLoadedKeys] = useState<Set<string>>(new Set());
    const [isEngineReady, setIsEngineReady] = useState(false);

    useEffect(() => {
        // Window keydown listener
        const handleKeyDown = async (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
            if (e.repeat) return; // Ignore hold auto-repeat

            const key = e.key.toLowerCase();
            if (KEYS.includes(key)) {
                if (!isEngineReady) {
                    await engine.init();
                    setIsEngineReady(true);
                }
                setActiveKeys(prev => new Set(prev).add(key));
                setSelectedKey(key);
                engine.noteOn(key);
                if (onKeyTriggered) onKeyTriggered(key);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (KEYS.includes(key)) {
                setActiveKeys(prev => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });
                engine.noteOff(key);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isEngineReady, onKeyTriggered]);

    const handleDrop = async (e: DragEvent<HTMLDivElement>, targetKey: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isEngineReady) {
            await engine.init();
            await engine.loadDefaultSamples();
            setLoadedKeys(new Set(KEYS));
            setIsEngineReady(true);
        }

        const file = e.dataTransfer.files[0];
        if (file && (file.type.match('audio.*') || file.name.endsWith('.wav') || file.name.endsWith('.mp3'))) {
            const url = URL.createObjectURL(file);
            try {
                await engine.loadSample(targetKey, url);
                setLoadedKeys(prev => new Set(prev).add(targetKey));
                setSelectedKey(targetKey);
            } catch (err) {
                console.error("Error loading dropped file", err);
            }
        } else {
            const sourceKey = e.dataTransfer.getData('text/plain');
            if (sourceKey && e.altKey && loadedKeys.has(sourceKey) && sourceKey !== targetKey) {
                await engine.duplicateCell(sourceKey, targetKey);
                setLoadedKeys(prev => new Set(prev).add(targetKey));
                setSelectedKey(targetKey);
            }
        }
    };

    const handleDragStart = (e: React.DragEvent, keyId: string) => {
        if (e.altKey && loadedKeys.has(keyId)) {
            e.dataTransfer.setData('text/plain', keyId);
            e.dataTransfer.effectAllowed = 'copy';
        } else {
            e.preventDefault(); // Cancel drag if alt isn't held
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleMouseDown = async (keyId: string) => {
        if (!isEngineReady) return;
        setActiveKeys(prev => new Set(prev).add(keyId));
        setSelectedKey(keyId);
        engine.noteOn(keyId);
        if (onKeyTriggered) onKeyTriggered(keyId);
    };

    const handleMouseUp = (keyId: string) => {
        if (!isEngineReady) return;
        setActiveKeys(prev => {
            const next = new Set(prev);
            next.delete(keyId);
            return next;
        });
        engine.noteOff(keyId);
    };

    return (
        <div className={styles.container}>
            {!isEngineReady && (
                <div className={styles.overlay} onClick={async () => {
                    await engine.init();
                    await engine.loadDefaultSamples();
                    setLoadedKeys(new Set(KEYS));
                    setIsEngineReady(true);
                }}>
                    Click anywhere or press a key to enable audio
                </div>
            )}

            <div className={styles.tabsHeader}>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'keyboard' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('keyboard')}
                >
                    Keyboard Map
                </button>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'editor' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('editor')}
                >
                    Sample Editor
                </button>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'mixer' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('mixer')}
                >
                    Mixer
                </button>
            </div>

            <div className={styles.layout}>
                <div className={styles.mainContentArea}>
                    {activeTab === 'keyboard' ? (
                        <div className={styles.gridContainer}>
                            <div className={styles.grid}>
                                {KEYS.map((keyId) => {
                                    const isLoaded = loadedKeys.has(keyId);
                                    const isActive = activeKeys.has(keyId);
                                    const isSelected = selectedKey === keyId;

                                    return (
                                        <div
                                            key={keyId}
                                            className={`${styles.cell} ${isActive ? styles.active : ''} ${isLoaded ? styles.loaded : ''} ${isSelected ? styles.selected : ''}`}
                                            draggable={true}
                                            onDragStart={(e) => handleDragStart(e, keyId)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, keyId)}
                                            onMouseDown={() => handleMouseDown(keyId)}
                                            onMouseUp={() => handleMouseUp(keyId)}
                                            onMouseLeave={() => isActive && handleMouseUp(keyId)}
                                        >
                                            <span className={styles.keyLabel}>{keyId.toUpperCase()}</span>
                                            {isLoaded && <div className={styles.statusDot}></div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : activeTab === 'editor' ? (
                        <div className={styles.sampleEditorContainer}>
                            <SampleEditor activeKey={selectedKey} />
                        </div>
                    ) : (
                        <div className={styles.sampleEditorContainer}>
                            <MixerPanel />
                        </div>
                    )}
                </div>

                <div className={styles.editorContainer}>
                    <CellEditor activeKey={selectedKey} />
                </div>
            </div>
        </div>
    );
};
