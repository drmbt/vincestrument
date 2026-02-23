import * as Tone from 'tone';

export interface SampleCell {
    key: string;
    url: string | null;
    player: Tone.Player | null;
    grainPlayer: Tone.GrainPlayer | null;
    mode: 'sampler' | 'granular';
    grainSize: number;
    overlap: number;
    playbackRate: number;
    trimStart: number;
    trimEnd: number;
    transpose: number;
    pianoMode: boolean;
    channel: Tone.Channel | null;
    volume: number;
    pan: number;
    mute: boolean;
}

export interface NoteRegion {
    id: string;      // Unique ID for UI rendering
    key: string;
    startTime: number;
    duration: number;
    transposeOffset?: number; // Per-note pitch shift in semitones
    trimStart?: number;       // Per-note trim start override
    trimEnd?: number;         // Per-note trim end override
}

class AudioEngine {
    private inited = false;
    private masterVolume: Tone.Volume;
    private fallbackSynth: Tone.MembraneSynth;

    public meter: Tone.Meter;
    public fft: Tone.FFT;
    public waveform: Tone.Waveform;
    public cells: Map<string, SampleCell> = new Map();

    // Global Effects
    public reverb: Tone.Reverb;
    public delay: Tone.PingPongDelay;
    public reverbVol: Tone.Volume;
    public delayVol: Tone.Volume;

    public onTrigger?: (key: string, data: { rms: number, centroid: number }) => void;
    public onSequenceUpdate?: (regions: NoteRegion[]) => void;

    // Sequencer State
    private loopPart: Tone.Part | null = null;
    private regions: NoteRegion[] = [];
    private activeRecordingNotes: Map<string, NoteRegion> = new Map();

    public loopLength: number = 4; // 4 seconds by default (e.g. 1 bar at 60 BPM or 2 bars at 120)
    public bpm: number = 120;

    private recordStartTime: number = 0;
    public isRecording: boolean = false;
    public isPlayingLoop: boolean = false;

    public selectedRegionId: string | null = null;
    public onSelectionUpdate?: (regionId: string | null) => void;

    constructor() {
        this.masterVolume = new Tone.Volume(0).toDestination();
        this.fallbackSynth = new Tone.MembraneSynth();
        this.meter = new Tone.Meter();
        this.fft = new Tone.FFT(2048);
        this.waveform = new Tone.Waveform(2048);

        // Initialize effects
        this.reverb = new Tone.Reverb({ decay: 2.5, preDelay: 0.1 });
        this.reverb.wet.value = 1; // 100% wet, we control level via reverbVol

        this.delay = new Tone.PingPongDelay({ delayTime: "8n", feedback: 0.4 });
        this.delay.wet.value = 1;

        this.reverbVol = new Tone.Volume(-Infinity);
        this.delayVol = new Tone.Volume(-Infinity);

        // Routing
        this.reverb.connect(this.reverbVol);
        this.delay.connect(this.delayVol);
        this.reverbVol.connect(this.masterVolume);
        this.delayVol.connect(this.masterVolume);

        this.masterVolume.connect(this.meter);
        this.masterVolume.connect(this.fft);
        this.masterVolume.connect(this.waveform);
        this.fallbackSynth.connect(this.masterVolume);
    }

    public async init() {
        if (this.inited) return;
        await Tone.start();
        Tone.Transport.bpm.value = this.bpm;
        Tone.Transport.start();
        console.log('AudioContext started');
        this.inited = true;
    }

    public setBpm(bpm: number) {
        this.bpm = bpm;
        Tone.Transport.bpm.value = bpm;
    }

    public setReverbAmount(val: number) {
        // Map 0-1 to Decibels (e.g., -60 to 0)
        this.reverbVol.volume.value = val <= 0 ? -Infinity : Tone.gainToDb(val);
    }

    public setDelayAmount(val: number) {
        this.delayVol.volume.value = val <= 0 ? -Infinity : Tone.gainToDb(val);
    }

    public setDelayTime(time: Tone.Unit.Time) {
        this.delay.delayTime.value = time;
    }

    public async loadDefaultSamples() {
        const baseUrl = 'https://tonejs.github.io/audio/';
        const defaults = [
            { key: 'q', url: baseUrl + 'drum-samples/CR78/kick.mp3' },
            { key: 'w', url: baseUrl + 'drum-samples/CR78/snare.mp3' },
            { key: 'e', url: baseUrl + 'drum-samples/CR78/hihat.mp3' },
            { key: 'r', url: baseUrl + 'drum-samples/CR78/tom1.mp3' },
            { key: 't', url: baseUrl + 'drum-samples/CR78/tom2.mp3' },
            { key: 'y', url: baseUrl + 'drum-samples/CR78/tom3.mp3' },
            { key: 'u', url: baseUrl + 'drum-samples/CR78/ride.mp3' },
            { key: 'i', url: baseUrl + 'drum-samples/CR78/cowbell.mp3' },
            { key: 'a', url: baseUrl + 'drum-samples/CR78/bongo.mp3' },
            { key: 's', url: baseUrl + 'drum-samples/CR78/conga1.mp3' },
            { key: 'd', url: baseUrl + 'drum-samples/CR78/conga2.mp3' },
            { key: 'f', url: baseUrl + 'drum-samples/CR78/conga3.mp3' },
            { key: 'g', url: baseUrl + 'drum-samples/CR78/guiro1.mp3' },
            { key: 'h', url: baseUrl + 'drum-samples/CR78/guiro2.mp3' },
            { key: 'j', url: baseUrl + 'drum-samples/CR78/tamb.mp3' },
            { key: 'k', url: baseUrl + 'drum-samples/CR78/claves.mp3' },
            { key: 'z', url: baseUrl + 'drum-samples/CR78/maracas.mp3' },
            { key: 'x', url: baseUrl + 'drum-samples/CR78/rimshot.mp3' },
            { key: 'c', url: baseUrl + 'drum-samples/CR78/cymbal.mp3' },
            { key: 'v', url: baseUrl + 'casio/A1.mp3' },
            { key: 'b', url: baseUrl + 'casio/C2.mp3' },
            { key: 'n', url: baseUrl + 'casio/E2.mp3' },
            { key: 'm', url: baseUrl + 'casio/G2.mp3' },
            { key: ',', url: baseUrl + 'casio/C3.mp3' }
        ];

        for (const def of defaults) {
            if (!this.cells.has(def.key)) {
                this.loadSample(def.key, def.url).catch(() => console.warn(`Failed to load ${def.url}`));
            }
        }
    }

    public async loadSample(key: string, fileUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const player = new Tone.Player({
                    url: fileUrl,
                    onload: () => {
                        const grainPlayer = new Tone.GrainPlayer({
                            url: player.buffer,
                            grainSize: 0.1,
                            overlap: 0.1,
                            playbackRate: 1
                        });

                        const channel = new Tone.Channel({ volume: 0, pan: 0, mute: false });
                        channel.connect(this.masterVolume);
                        channel.connect(this.reverb);
                        channel.connect(this.delay);

                        player.connect(channel);
                        grainPlayer.connect(channel);

                        const cell: SampleCell = this.cells.get(key) || {
                            key,
                            url: fileUrl,
                            player: null,
                            grainPlayer: null,
                            mode: 'sampler',
                            grainSize: 0.1,
                            overlap: 0.1,
                            playbackRate: 1,
                            trimStart: 0,
                            trimEnd: player.buffer.duration,
                            transpose: 0,
                            pianoMode: false,
                            channel: null,
                            volume: 0,
                            pan: 0,
                            mute: false
                        };

                        if (cell.player) cell.player.dispose();
                        if (cell.grainPlayer) cell.grainPlayer.dispose();
                        if (cell.channel) cell.channel.dispose();

                        cell.url = fileUrl;
                        cell.player = player;
                        cell.grainPlayer = grainPlayer;
                        cell.channel = channel;
                        cell.trimStart = 0;
                        cell.trimEnd = player.buffer.duration;
                        this.cells.set(key, cell);
                        resolve();
                    },
                    onerror: (err) => reject(err)
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    public async duplicateCell(sourceKey: string, destKey: string): Promise<void> {
        const sourceCell = this.cells.get(sourceKey);
        if (!sourceCell || !sourceCell.url) return;

        await this.loadSample(destKey, sourceCell.url);

        const destCell = this.cells.get(destKey);
        if (destCell) {
            destCell.mode = sourceCell.mode;
            destCell.grainSize = sourceCell.grainSize;
            destCell.overlap = sourceCell.overlap;
            destCell.playbackRate = sourceCell.playbackRate;
            destCell.trimStart = sourceCell.trimStart;
            destCell.trimEnd = sourceCell.trimEnd;
            destCell.transpose = sourceCell.transpose;
            destCell.pianoMode = sourceCell.pianoMode;
            destCell.volume = sourceCell.volume;
            destCell.pan = sourceCell.pan;
            destCell.mute = sourceCell.mute;

            if (destCell.grainPlayer) {
                destCell.grainPlayer.grainSize = destCell.grainSize;
                destCell.grainPlayer.overlap = destCell.overlap;
                destCell.grainPlayer.playbackRate = destCell.playbackRate;
            }
            if (destCell.channel) {
                destCell.channel.volume.value = destCell.volume;
                destCell.channel.pan.value = destCell.pan;
                destCell.channel.mute = destCell.mute;
            }
        }
    }

    public setCellVolume(key: string, volDb: number) {
        const cell = this.cells.get(key);
        if (cell && cell.channel) {
            cell.volume = volDb;
            cell.channel.volume.value = volDb;
        }
    }

    public setCellPan(key: string, pan: number) {
        const cell = this.cells.get(key);
        if (cell && cell.channel) {
            cell.pan = pan;
            cell.channel.pan.value = pan;
        }
    }

    public setCellMute(key: string, mute: boolean) {
        const cell = this.cells.get(key);
        if (cell && cell.channel) {
            cell.mute = mute;
            cell.channel.mute = mute;
        }
    }

    public playKey(key: string, overrideMode?: 'sampler' | 'granular') {
        this.noteOn(key, overrideMode);
    }

    public noteOn(key: string, overrideMode?: 'sampler' | 'granular', skipRecord = false, time?: number, transposeOffset: number = 0, trimStartOverride?: number, trimEndOverride?: number) {
        if (!this.inited) return;

        const playTime = time !== undefined ? time : Tone.now();

        // Start recording a new region
        if (this.isRecording && !skipRecord) {
            const timeOffset = playTime - this.recordStartTime;
            if (timeOffset < this.loopLength) {
                const newRegion: NoteRegion = {
                    id: Math.random().toString(36).substring(7),
                    key,
                    startTime: timeOffset,
                    duration: 0.1, // temporary duration until noteOff
                    transposeOffset: 0
                };
                this.activeRecordingNotes.set(key, newRegion);
                this.regions.push(newRegion);
                if (this.onSequenceUpdate) this.onSequenceUpdate([...this.regions]);
            }
        }

        const cell = this.cells.get(key);

        if (cell && cell.player && cell.player.loaded && cell.grainPlayer && cell.grainPlayer.loaded) {
            const playMode = overrideMode || cell.mode;

            // Find if there's a specific region being played to use its trim overrides
            // In a real sophisticated engine, time would be enough to match, but we can pass the region ID or just look it up if we are playing the loopPart
            // Since we don't pass the region object to noteOn, let's allow it as a parameter, or calculate trim beforehand.
            // Actually, we can just look up the region if `time` matches a `startTime` precisely, or we can just modify the signature to pass the region directly.
            // But let's keep it simple: if transposeOffset is passed, we might also want trim passed.
            // For now, let's just pass the region overrides directly.

            const useTrimStart = trimStartOverride !== undefined ? trimStartOverride : cell.trimStart;
            const useTrimEnd = trimEndOverride !== undefined ? trimEndOverride : cell.trimEnd;
            const duration = useTrimEnd - useTrimStart;

            const finalTranspose = cell.transpose + transposeOffset;

            if (playMode === 'sampler') {
                cell.player.playbackRate = Math.pow(2, finalTranspose / 12);
                cell.player.stop(playTime);
                if (cell.pianoMode) {
                    cell.player.start(playTime, useTrimStart);
                } else {
                    cell.player.start(playTime, useTrimStart, duration);
                }
            } else {
                cell.grainPlayer.detune = finalTranspose * 100;
                cell.grainPlayer.stop(playTime);
                if (cell.pianoMode) {
                    cell.grainPlayer.start(playTime, useTrimStart);
                } else {
                    cell.grainPlayer.start(playTime, useTrimStart, duration);
                }
            }

            // Visuals
            Tone.Draw.schedule(() => {
                this.emitVisualTrigger(key);
            }, playTime);
        } else {
            this.fallbackSynth.triggerAttack("C2", playTime);
            Tone.Draw.schedule(() => this.emitVisualTrigger(key), playTime);
        }
    }

    public noteOff(key: string, skipRecord = false, time?: number) {
        if (!this.inited) return;

        const offTime = time !== undefined ? time : Tone.now();

        if (this.isRecording && !skipRecord) {
            const region = this.activeRecordingNotes.get(key);
            if (region) {
                const timeOffset = offTime - this.recordStartTime;
                let duration = timeOffset - region.startTime;
                if (duration <= 0) duration = 0.1;
                // Cap at loop length
                if (region.startTime + duration > this.loopLength) {
                    duration = this.loopLength - region.startTime;
                }
                region.duration = duration;
                this.activeRecordingNotes.delete(key);
                if (this.onSequenceUpdate) this.onSequenceUpdate([...this.regions]);
            }
        }

        const cell = this.cells.get(key);
        if (cell && cell.player && cell.grainPlayer) {
            if (cell.pianoMode) {
                if (cell.mode === 'sampler') cell.player.stop(offTime + 0.05);
                else cell.grainPlayer.stop(offTime + 0.05);
            }
        } else {
            this.fallbackSynth.triggerRelease(offTime);
        }
    }

    public startRecording() {
        this.activeRecordingNotes.clear();
        this.isRecording = true;
        // Do not clear this.regions or this.loopPart here, so we can overdub while it plays

        if (!this.isPlayingLoop && !this.loopPart) {
            // First time recording
            this.recordStartTime = Tone.now();
            this.isPlayingLoop = false;
        } else {
            // Overdubbing: sync record start to the current loop cycle
            const currentLoopTime = Tone.Transport.seconds % this.loopLength;
            this.recordStartTime = Tone.now() - currentLoopTime;
        }

        // Pre-schedule stop
        setTimeout(() => {
            if (this.isRecording) {
                // Close any hanging notes
                this.activeRecordingNotes.forEach((region) => {
                    region.duration = this.loopLength - region.startTime;
                });
                this.activeRecordingNotes.clear();
                this.stopRecordingAndLoop();
            }
        }, this.loopLength * 1000);
    }

    public stopRecordingAndLoop() {
        this.isRecording = false;
        if (this.regions.length === 0) return;

        this.isPlayingLoop = true;

        // Refresh part
        if (this.loopPart) this.loopPart.dispose();

        // Convert regions to Tone.Part events
        const partEvents = this.regions.map(r => ({
            time: r.startTime,
            duration: r.duration,
            key: r.key
        }));

        this.loopPart = new Tone.Part((time, value) => {
            const region = value as any;
            this.noteOn(region.key, undefined, true, time);
            this.noteOff(region.key, true, time + region.duration);
        }, partEvents);

        this.loopPart.loop = true;
        this.loopPart.loopEnd = this.loopLength;
        this.loopPart.start(0);
    }

    public updateRegions(newRegions: NoteRegion[]) {
        this.regions = newRegions;
        if (this.isPlayingLoop) {
            this.stopRecordingAndLoop(); // Recompile part
        }
        if (this.onSequenceUpdate) {
            this.onSequenceUpdate([...this.regions]);
        }
    }

    public togglePlayback() {
        if (this.isPlayingLoop) {
            this.stopLoop();
        } else {
            this.playLoop();
        }
    }

    public playLoop() {
        if (this.regions.length === 0) return;
        this.isPlayingLoop = true;
        if (this.onSequenceUpdate) this.onSequenceUpdate(this.regions);

        // Refresh part
        if (this.loopPart) this.loopPart.dispose();

        // Convert regions to Tone.Part events
        const partEvents = this.regions.map(r => ({
            time: r.startTime,
            duration: r.duration,
            key: r.key
        }));

        this.loopPart = new Tone.Part((time, value) => {
            const region = value as any;
            this.noteOn(region.key, undefined, true, time);
            this.noteOff(region.key, true, time + region.duration);
        }, partEvents);

        this.loopPart.loop = true;
        this.loopPart.loopEnd = this.loopLength;

        // Sync to next musical bar or immediately
        this.loopPart.start(0);
    }

    public stopLoop() {
        this.isPlayingLoop = false;
        if (this.loopPart) {
            this.loopPart.stop();
        }
        if (this.onSequenceUpdate) this.onSequenceUpdate(this.regions);
    }

    public clearLoop() {
        if (this.loopPart) {
            this.loopPart.dispose();
            this.loopPart = null;
        }
        this.regions = [];
        this.isPlayingLoop = false;
        if (this.onSequenceUpdate) {
            this.onSequenceUpdate([...this.regions]);
        }
    }

    public setSelectedRegion(regionId: string | null) {
        this.selectedRegionId = regionId;
        if (this.onSelectionUpdate) {
            this.onSelectionUpdate(regionId);
        }
    }

    public getRegions() {
        return this.regions;
    }

    public updateCellConfig(key: string, updates: Partial<SampleCell>) {
        const cell = this.cells.get(key);
        if (!cell) return;

        Object.assign(cell, updates);

        if (cell.grainPlayer) {
            if (updates.grainSize !== undefined) cell.grainPlayer.grainSize = updates.grainSize;
            if (updates.overlap !== undefined) cell.grainPlayer.overlap = updates.overlap;
            if (updates.playbackRate !== undefined) cell.grainPlayer.playbackRate = updates.playbackRate;
        }

        if (updates.trimStart !== undefined) cell.trimStart = updates.trimStart;
        if (updates.trimEnd !== undefined) cell.trimEnd = updates.trimEnd;

        this.cells.set(key, cell);
    }

    private emitVisualTrigger(key: string) {
        const values = this.fft.getValue();
        let sum = 0;
        let weightedSum = 0;
        for (let i = 0; i < values.length; i++) {
            const v = Math.pow(10, (values[i] as number) / 20) || 0;
            if (isFinite(v)) {
                sum += v;
                weightedSum += v * i;
            }
        }
        let centroid = sum === 0 ? 0 : weightedSum / sum;

        let rmsVal = this.meter.getValue() as number;
        if (!isFinite(rmsVal)) rmsVal = -100;
        if (!isFinite(centroid)) centroid = 0;

        if (this.onTrigger) {
            this.onTrigger(key, { rms: rmsVal, centroid: centroid });
        }
    }
    public serializeState(): string {
        const serializedCells: any[] = [];
        this.cells.forEach(cell => {
            serializedCells.push({
                key: cell.key,
                url: cell.url,
                mode: cell.mode,
                grainSize: cell.grainSize,
                overlap: cell.overlap,
                playbackRate: cell.playbackRate,
                trimStart: cell.trimStart,
                trimEnd: cell.trimEnd,
                transpose: cell.transpose,
                pianoMode: cell.pianoMode,
                volume: cell.volume,
                pan: cell.pan,
                mute: cell.mute
            });
        });

        const state = {
            bpm: this.bpm,
            loopLength: this.loopLength,
            cells: serializedCells,
            regions: this.regions
        };

        return JSON.stringify(state);
    }

    public async loadState(jsonString: string): Promise<void> {
        try {
            const state = JSON.parse(jsonString);

            this.stopLoop();
            this.clearLoop();

            if (state.bpm) this.setBpm(state.bpm);
            if (state.loopLength) this.loopLength = state.loopLength;

            if (state.cells && Array.isArray(state.cells)) {
                const loadPromises = state.cells.map(async (cellData: any) => {
                    if (cellData.url) {
                        try {
                            await this.loadSample(cellData.key, cellData.url);
                            this.updateCellConfig(cellData.key, {
                                mode: cellData.mode,
                                grainSize: cellData.grainSize,
                                overlap: cellData.overlap,
                                playbackRate: cellData.playbackRate,
                                trimStart: cellData.trimStart,
                                trimEnd: cellData.trimEnd,
                                transpose: cellData.transpose,
                                pianoMode: cellData.pianoMode
                            });

                            if (cellData.volume !== undefined) this.setCellVolume(cellData.key, cellData.volume);
                            if (cellData.pan !== undefined) this.setCellPan(cellData.key, cellData.pan);
                            if (cellData.mute !== undefined) this.setCellMute(cellData.key, cellData.mute);
                        } catch (err) {
                            console.error(`Failed to load sample for key ${cellData.key} from ${cellData.url}`, err);
                        }
                    }
                });
                await Promise.all(loadPromises);
            }

            if (state.regions && Array.isArray(state.regions)) {
                this.updateRegions(state.regions);
            }

        } catch (e) {
            console.error("Failed to parse or load state", e);
        }
    }
}

export const engine = new AudioEngine();
