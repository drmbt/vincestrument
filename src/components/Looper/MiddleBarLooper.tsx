import React, { useEffect, useState, useRef } from 'react';
import * as Tone from 'tone';
import type { NoteRegion } from '../../core/AudioEngine';
import { engine } from '../../core/AudioEngine';
import { Trash2, Play, Square, AlignLeft } from 'lucide-react';
import styles from './MiddleBarLooper.module.css';

const ROW_1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i'];
const ROW_2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'];
const ROW_3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ','];
const KEYS = [...ROW_1, ...ROW_2, ...ROW_3];

type InteractionMode = 'idle' | 'drag' | 'stretch';

export const MiddleBarLooper: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [regions, setRegions] = useState<NoteRegion[]>([]);
    const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);
    const [playheadPos, setPlayheadPos] = useState(0);
    const renderRef = useRef<number>(0);

    const [interaction, setInteraction] = useState<{
        mode: InteractionMode,
        regionId: string | null,
        startX: number,
        startRegionTime: number,
        startRegionDuration: number
    }>({
        mode: 'idle',
        regionId: null,
        startX: 0,
        startRegionTime: 0,
        startRegionDuration: 0
    });

    useEffect(() => {
        // Initialize from engine state
        setRegions(engine.getRegions());

        engine.onSequenceUpdate = (newRegions) => {
            if (interaction.mode === 'idle') {
                setRegions(newRegions);
            }
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
                // force re-render so UI updates play state
                setInteraction(prev => ({ ...prev }));
            } else if (e.key === ' ') {
                e.preventDefault();
                engine.togglePlayback();
                setInteraction(prev => ({ ...prev }));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            engine.onSequenceUpdate = undefined;
        };
    }, [interaction.mode]);

    // Handle Delete / Backspace for selected regions
    useEffect(() => {
        const handleDelete = (e: KeyboardEvent) => {
            if ((e.key === 'Backspace' || e.key === 'Delete') && selectedRegionIds.length > 0) {
                // Ignore if user is typing in an input field (like BPM)
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

                const newRegions = regions.filter(r => !selectedRegionIds.includes(r.id));
                setRegions(newRegions);
                engine.updateRegions(newRegions);
                setSelectedRegionIds([]);
            }
        };
        window.addEventListener('keydown', handleDelete);
        return () => window.removeEventListener('keydown', handleDelete);
    }, [selectedRegionIds, regions]);

    // Playhead animation loop
    useEffect(() => {
        const draw = () => {
            if (engine.isPlayingLoop || engine.isRecording) {
                // transport time modulo loop length
                const currentTime = Tone.Transport.seconds % engine.loopLength;
                const percent = (currentTime / engine.loopLength) * 100;
                setPlayheadPos(percent);
            } else {
                setPlayheadPos(0);
            }
            renderRef.current = requestAnimationFrame(draw);
        };
        renderRef.current = requestAnimationFrame(draw);

        return () => {
            if (renderRef.current) cancelAnimationFrame(renderRef.current);
        };
    }, []);

    // Interaction Drag / Stretch
    useEffect(() => {
        if (interaction.mode === 'idle') return;

        const handleMouseMove = (e: MouseEvent) => {
            const laneTrackNode = document.querySelector(`.${styles.laneTrack}`);
            if (!laneTrackNode) return;
            const width = laneTrackNode.clientWidth;

            const deltaX = e.clientX - interaction.startX;
            const deltaTime = (deltaX / width) * engine.loopLength;

            const snapGrid = engine.loopLength / 32; // 1/32 quantization

            const newRegions = [...regions];
            const targetRegion = newRegions.find(r => r.id === interaction.regionId);
            if (!targetRegion) return;

            if (interaction.mode === 'drag') {
                let newStartTime = interaction.startRegionTime + deltaTime;
                newStartTime = Math.round(newStartTime / snapGrid) * snapGrid;

                if (newStartTime < 0) newStartTime = 0;
                if (newStartTime + targetRegion.duration > engine.loopLength) {
                    newStartTime = engine.loopLength - targetRegion.duration;
                }
                targetRegion.startTime = newStartTime;
            } else if (interaction.mode === 'stretch') {
                let newDuration = interaction.startRegionDuration + deltaTime;
                newDuration = Math.round(newDuration / snapGrid) * snapGrid;

                if (newDuration < 0.05) newDuration = 0.05;
                if (interaction.startRegionTime + newDuration > engine.loopLength) {
                    newDuration = engine.loopLength - interaction.startRegionTime;
                }
                targetRegion.duration = newDuration;
            }

            setRegions([...newRegions]);
        };

        const handleMouseUp = () => {
            engine.updateRegions(regions);
            setInteraction(prev => ({ ...prev, mode: 'idle', regionId: null }));
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [interaction, regions]);

    const handleClear = () => {
        engine.clearLoop();
    };

    const handleQuantize = () => {
        const snapGrid = engine.loopLength / 16; // 1/16th note quantization
        const newRegions = regions.map(r => {
            let newTime = Math.round(r.startTime / snapGrid) * snapGrid;
            if (newTime >= engine.loopLength) newTime = 0;
            return { ...r, startTime: newTime };
        });
        setRegions(newRegions);
        engine.updateRegions(newRegions);
    };

    const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value > 0 && value < 999) {
            engine.setBpm(value);
            setPlayheadPos(prev => prev === -1 ? 0 : prev);
        }
    };

    const handleRegionMouseDown = (e: React.MouseEvent, region: NoteRegion) => {
        e.stopPropagation();

        let targetRegionId = region.id;
        let isAltDrag = false;

        if (e.altKey) {
            // Clone region
            const newRegion = { ...region, id: Math.random().toString(36).substring(7) };
            const newRegions = [...regions, newRegion];
            setRegions(newRegions);
            engine.updateRegions(newRegions);
            targetRegionId = newRegion.id;
            isAltDrag = true;
        }

        if (e.metaKey || e.ctrlKey) {
            setSelectedRegionIds(prev =>
                prev.includes(targetRegionId) ? prev.filter(id => id !== targetRegionId) : [...prev, targetRegionId]
            );
        } else {
            setSelectedRegionIds([targetRegionId]);
        }

        const rect = (e.target as HTMLElement).getBoundingClientRect();
        // Right Edge tolerance for stretch handle, disable stretch if alt-dragging
        const isStretch = e.clientX > rect.right - 8 && !isAltDrag;

        setInteraction({
            mode: isStretch ? 'stretch' : 'drag',
            regionId: targetRegionId,
            startX: e.clientX,
            startRegionTime: region.startTime,
            startRegionDuration: region.duration
        });
    };

    const handleRegionContextMenu = (e: React.MouseEvent, regionId: string) => {
        e.preventDefault();
        const newRegions = regions.filter(r => r.id !== regionId);
        setRegions(newRegions);
        engine.updateRegions(newRegions);
    };

    const currentBpm = Math.round(Tone.Transport.bpm.value);

    return (
        <div className={styles.container}>
            <div className={styles.controls}>
                <div className={styles.statusLed}>
                    <button
                        className={styles.iconBtn}
                        onClick={() => { engine.togglePlayback(); setInteraction(prev => ({ ...prev })); }}
                        title="Play/Pause (Space)"
                    >
                        {engine.isPlayingLoop ? <Square size={16} /> : <Play size={16} />}
                    </button>
                    <div className={`${styles.led} ${isRecording ? styles.ledRed : (regions.length > 0 ? styles.ledGreen : '')}`} />
                    <span className={styles.statusText}>
                        {isRecording ? 'RECORDING (Hold Shift)' : (regions.length > 0 ? 'READY' : 'IDLE (Hold Shift to Rec)')}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '16px', gap: '8px' }}>
                        <span className={styles.statusText}>BPM:</span>
                        <input
                            type="number"
                            defaultValue={currentBpm}
                            onBlur={handleBpmChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleBpmChange(e as any);
                            }}
                            style={{ width: '50px', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 4px' }}
                        />
                    </div>
                </div>

                <div className={styles.buttons}>
                    <button
                        className={styles.iconBtn}
                        onClick={handleQuantize}
                        disabled={regions.length === 0}
                        title="Quantize (Nearest 1/16th)"
                    >
                        <AlignLeft size={16} />
                    </button>
                    <button
                        className={styles.iconBtn}
                        onClick={handleClear}
                        disabled={regions.length === 0}
                        title="Clear Sequence"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div
                className={styles.sequencerArea}
                onMouseDown={() => setSelectedRegionIds([])}
            >
                {/* 1/4 Note Grid lines */}
                {Array.from({ length: 16 }).map((_, i) => (
                    <div
                        key={`grid-${i}`}
                        className={styles.gridLine}
                        style={{ left: `calc(60px + ${(i / 16) * 100}% - ${(i / 16) * 60}px)` }}
                    />
                ))}

                {(engine.isPlayingLoop || engine.isRecording) && (
                    <div className={styles.playhead} style={{ left: `calc(60px + ${playheadPos}% - (${playheadPos} / 100) * 60px)` }} />
                )}

                {KEYS.map(key => {
                    const keyRegions = regions.filter(r => r.key === key);

                    if (keyRegions.length === 0) return null; // Only show lanes with active recordings

                    return (
                        <div key={key} className={styles.lane}>
                            <div className={`${styles.laneHeader} ${keyRegions.length > 0 ? styles.active : ''}`}>
                                {key}
                            </div>
                            <div className={styles.laneTrack}>
                                {keyRegions.map(region => {
                                    const leftValue = (region.startTime / engine.loopLength) * 100;
                                    const widthValue = (region.duration / engine.loopLength) * 100;
                                    return (
                                        <div
                                            key={region.id}
                                            className={`${styles.noteRegion} ${selectedRegionIds.includes(region.id) ? styles.selected : ''}`}
                                            style={{
                                                left: `${leftValue}%`,
                                                width: `${widthValue}%`
                                            }}
                                            title={`Time: ${region.startTime.toFixed(2)}s, Dur: ${region.duration.toFixed(2)}s, Pitch: ${region.transposeOffset || 0}st`}
                                            onMouseDown={(e) => handleRegionMouseDown(e, region)}
                                            onContextMenu={(e) => handleRegionContextMenu(e, region.id)}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                const val = window.prompt("Transpose this note (semitones):", (region.transposeOffset || 0).toString());
                                                if (val !== null) {
                                                    const parsed = parseInt(val, 10);
                                                    if (!isNaN(parsed)) {
                                                        const newRegions = regions.map(r => r.id === region.id ? { ...r, transposeOffset: parsed } : r);
                                                        setRegions(newRegions);
                                                        engine.updateRegions(newRegions);
                                                    }
                                                }
                                            }}
                                        >
                                            {region.transposeOffset ? <span style={{ opacity: 0.5 }}>{region.transposeOffset > 0 ? '+' : ''}{region.transposeOffset}</span> : null}
                                            <div className={styles.stretchHandle} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
