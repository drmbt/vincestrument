import * as Tone from 'tone';

export interface SampleCell {
    key: string;
    url: string | null;
    player: Tone.Player | null;
    grainPlayer: Tone.GrainPlayer | null;
    mode: 'sampler' | 'granular';
    // Granular params
    grainSize: number;
    overlap: number;
    playbackRate: number;
    // Trim params
    trimStart: number;
    trimEnd: number;
}

export interface LoopEvent {
    time: number; // Time relative to loop start
    key: string;
}

class AudioEngine {
    private inited = false;
    private masterVolume: Tone.Volume;
    private fallbackSynth: Tone.MembraneSynth;

    // Analyzers for visuals
    public meter: Tone.Meter;
    public fft: Tone.FFT;

    // Mapping layout (e.g. 24 keys: 3 rows of 8)
    public cells: Map<string, SampleCell> = new Map();

    // Callbacks for visual events
    public onTrigger?: (key: string, data: { rms: number, centroid: number }) => void;
    public onLoopUpdate?: (events: LoopEvent[]) => void;

    // Sequencer / Looper State
    private loopPart: Tone.Part | null = null;
    private recordedEvents: LoopEvent[] = [];
    public loopLength: number = 2; // in seconds
    private recordStartTime: number = 0;
    public isRecording: boolean = false;
    public isPlayingLoop: boolean = false;

    constructor() {
        this.masterVolume = new Tone.Volume(0).toDestination();
        this.fallbackSynth = new Tone.MembraneSynth();

        this.meter = new Tone.Meter();
        this.fft = new Tone.FFT(2048);

        this.masterVolume.connect(this.meter);
        this.masterVolume.connect(this.fft);
        this.fallbackSynth.connect(this.masterVolume);
    }

    public async init() {
        if (this.inited) return;
        await Tone.start();
        Tone.Transport.start(); // Start the transport for the looper
        console.log('AudioContext started');
        this.inited = true;
    }

    public async loadDefaultSamples() {
        // Pre-populate some keys for immediate testing
        const defaults = [
            { key: 'q', url: 'https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3' },
            { key: 'w', url: 'https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3' },
            { key: 'e', url: 'https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3' }
        ];

        for (const def of defaults) {
            if (!this.cells.has(def.key)) {
                await this.loadSample(def.key, def.url).catch(console.error);
            }
        }
    }

    public async loadSample(key: string, fileUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const player = new Tone.Player({
                    url: fileUrl,
                    onload: () => {
                        // Create GrainPlayer using the already loaded buffer
                        const grainPlayer = new Tone.GrainPlayer({
                            url: player.buffer,
                            grainSize: 0.1,
                            overlap: 0.1,
                            playbackRate: 1
                        });

                        player.connect(this.masterVolume);
                        grainPlayer.connect(this.masterVolume);

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
                            trimEnd: player.buffer.duration
                        };

                        // Cleanup existing players if redefining
                        if (cell.player) cell.player.dispose();
                        if (cell.grainPlayer) cell.grainPlayer.dispose();

                        cell.url = fileUrl;
                        cell.player = player;
                        cell.grainPlayer = grainPlayer;
                        // Default trim to full duration of newly loaded sample
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

    public playKey(key: string, overrideMode?: 'sampler' | 'granular') {
        if (!this.inited) return;

        // Record event if recording
        if (this.isRecording) {
            const timeOffset = Tone.now() - this.recordStartTime;
            if (timeOffset < this.loopLength) {
                this.recordedEvents.push({ time: timeOffset, key });
                if (this.onLoopUpdate) {
                    this.onLoopUpdate([...this.recordedEvents]);
                }
            }
        }

        const cell = this.cells.get(key);

        if (cell && cell.player && cell.player.loaded && cell.grainPlayer && cell.grainPlayer.loaded) {
            const playMode = overrideMode || cell.mode;
            const duration = cell.trimEnd - cell.trimStart;

            if (playMode === 'sampler') {
                cell.player.stop();
                cell.player.start(0, cell.trimStart, duration);
            } else {
                cell.grainPlayer.stop();
                cell.grainPlayer.start(0, cell.trimStart, duration);
            }
            this.emitVisualTrigger(key);
        } else {
            // Test tone for empty cells so visuals can be verified
            this.fallbackSynth.triggerAttackRelease("C2", "8n");
            setTimeout(() => this.emitVisualTrigger(key), 50); // Small delay for analyzers to catch the synth
        }
    }

    public startRecording() {
        this.recordedEvents = [];
        this.isRecording = true;
        this.isPlayingLoop = false;
        if (this.loopPart) {
            this.loopPart.dispose();
            this.loopPart = null;
        }
        this.recordStartTime = Tone.now();

        // Stop recording automatically after loopLength
        setTimeout(() => {
            if (this.isRecording) this.stopRecordingAndLoop();
        }, this.loopLength * 1000);
    }

    public stopRecordingAndLoop() {
        this.isRecording = false;
        if (this.recordedEvents.length === 0) return;

        this.isPlayingLoop = true;

        // Create a Tone.Part to schedule the recorded events
        this.loopPart = new Tone.Part((time, event) => {
            // We use Tone.Draw or schedule to play exactly at `time`
            // but for simplicity and immediate reaction, we can just trigger playKey
            // A more robust way is to pass `time` to the player, but our beat juggling style uses stop/start.
            // For now, we'll just fire it immediately when the callback hits.
            Tone.Draw.schedule(() => {
                // To prevent infinite feedback loop if we call playKey, we manually trigger
                const cell = this.cells.get(event.key);
                if (cell && cell.player && cell.player.loaded && cell.grainPlayer && cell.grainPlayer.loaded) {
                    const playMode = cell.mode;
                    const duration = cell.trimEnd - cell.trimStart;
                    if (playMode === 'sampler') {
                        cell.player.stop();
                        cell.player.start(0, cell.trimStart, duration);
                    } else {
                        cell.grainPlayer.stop();
                        cell.grainPlayer.start(0, cell.trimStart, duration);
                    }
                    this.emitVisualTrigger(event.key);
                } else {
                    this.fallbackSynth.triggerAttackRelease("C2", "8n");
                    setTimeout(() => this.emitVisualTrigger(event.key), 50);
                }
            }, time);
        }, this.recordedEvents);

        this.loopPart.loop = true;
        this.loopPart.loopEnd = this.loopLength;
        this.loopPart.start(0);
    }

    public clearLoop() {
        if (this.loopPart) {
            this.loopPart.dispose();
            this.loopPart = null;
        }
        this.recordedEvents = [];
        this.isPlayingLoop = false;
        if (this.onLoopUpdate) {
            this.onLoopUpdate([...this.recordedEvents]);
        }
    }

    public getRecordedEvents() {
        return this.recordedEvents;
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

        // Handle trim offsets
        if (updates.trimStart !== undefined) cell.trimStart = updates.trimStart;
        if (updates.trimEnd !== undefined) cell.trimEnd = updates.trimEnd;

        this.cells.set(key, cell);
    }

    private emitVisualTrigger(key: string) {
        // Calculate spectral centroid as a rough estimate
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
            this.onTrigger(key, {
                rms: rmsVal,
                centroid: centroid
            });
        }
    }
}

export const engine = new AudioEngine();
