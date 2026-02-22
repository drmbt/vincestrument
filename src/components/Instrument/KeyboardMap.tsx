import React, { useEffect, useState } from 'react';
import type { DragEvent } from 'react';
import { engine } from '../../core/AudioEngine';
import { CellEditor } from './CellEditor';
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
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [selectedKey, setSelectedKey] = useState<string>('q');
    const [loadedKeys, setLoadedKeys] = useState<Set<string>>(new Set());
    const [isEngineReady, setIsEngineReady] = useState(false);

    useEffect(() => {
        // Window keydown listener
        const handleKeyDown = async (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            const key = e.key.toLowerCase();
            if (KEYS.includes(key)) {
                if (!isEngineReady) {
                    await engine.init();
                    setIsEngineReady(true);
                }
                setActiveKey(key);
                setSelectedKey(key);
                engine.playKey(key);
                if (onKeyTriggered) onKeyTriggered(key);
            }
        };

        const handleKeyUp = () => {
            setActiveKey(null);
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
            await engine.loadDefaultSamples(); // Added this line
            setLoadedKeys(new Set(['q', 'w', 'e'])); // Added this line
            setIsEngineReady(true);
        }

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('audio/')) {
            const url = URL.createObjectURL(file);
            try {
                await engine.loadSample(targetKey, url);
                setLoadedKeys(prev => new Set(prev).add(targetKey));
                setSelectedKey(targetKey);
                console.log(`Loaded sample to key: ${targetKey}`);
            } catch (err) {
                console.error('Error loading sample', err);
            }
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <div className={styles.container}>
            {!isEngineReady && (
                <div className={styles.overlay} onClick={async () => {
                    await engine.init();
                    await engine.loadDefaultSamples();
                    setLoadedKeys(new Set(['q', 'w', 'e']));
                    setIsEngineReady(true);
                }}>
                    Click anywhere or press a key to enable audio
                </div>
            )}

            <div className={styles.layout}>
                <div className={styles.gridContainer}>
                    <div className={styles.grid}>
                        {KEYS.map((keyId) => {
                            const isLoaded = loadedKeys.has(keyId);
                            const isActive = activeKey === keyId;
                            const isSelected = selectedKey === keyId;

                            return (
                                <div
                                    key={keyId}
                                    className={`${styles.cell} ${isActive ? styles.active : ''} ${isLoaded ? styles.loaded : ''} ${isSelected ? styles.selected : ''}`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, keyId)}
                                    onClick={() => {
                                        if (!isEngineReady) return;
                                        setActiveKey(keyId);
                                        setSelectedKey(keyId);
                                        engine.playKey(keyId);
                                        if (onKeyTriggered) onKeyTriggered(keyId);
                                        setTimeout(() => setActiveKey(null), 100);
                                    }}
                                >
                                    <span className={styles.keyLabel}>{keyId.toUpperCase()}</span>
                                    {isLoaded && <div className={styles.statusDot}></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={styles.editorContainer}>
                    <CellEditor activeKey={selectedKey} />
                </div>
            </div>
        </div>
    );
};
