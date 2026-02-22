import * as Tone from 'tone';

export interface SampleCell {
    key: string;
    url: string | null;
    player: Tone.Player | null;
    mode: 'sampler' | 'granular';
    // Future: add granular specific properties like grainSize, overlap, etc.
}

class AudioEngine {
    private inited = false;
    private masterVolume: Tone.Volume;

    // Analyzers for visuals
    public meter: Tone.Meter;
    public fft: Tone.FFT;

    // Mapping layout (e.g. 24 keys: 3 rows of 8)
    public cells: Map<string, SampleCell> = new Map();

    // Callbacks for visual events
    public onTrigger?: (key: string, data: { rms: number, centroid: number }) => void;

    constructor() {
        this.masterVolume = new Tone.Volume(0).toDestination();
        this.meter = new Tone.Meter();
        this.fft = new Tone.FFT(2048);
        this.masterVolume.connect(this.meter);
        this.masterVolume.connect(this.fft);
    }

    public async init() {
        if (this.inited) return;
        await Tone.start();
        console.log('AudioContext started');
        this.inited = true;
    }

    public async loadSample(key: string, fileUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const player = new Tone.Player({
                    url: fileUrl,
                    onload: () => {
                        player.connect(this.masterVolume);

                        const cell = this.cells.get(key) || {
                            key,
                            url: fileUrl,
                            player: null,
                            mode: 'sampler'
                        };

                        // Cleanup existing player if redefining
                        if (cell.player) {
                            cell.player.dispose();
                        }

                        cell.url = fileUrl;
                        cell.player = player;
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

    public playKey(key: string) {
        if (!this.inited) return;
        const cell = this.cells.get(key);
        if (cell && cell.player && cell.player.loaded) {
            // Stop and restart to act as immediate trigger (beat juggling style)
            cell.player.stop();
            cell.player.start();

            // Calculate spectral centroid as a rough estimate
            const values = this.fft.getValue();
            let sum = 0;
            let weightedSum = 0;
            for (let i = 0; i < values.length; i++) {
                const v = Math.pow(10, (values[i] as number) / 20) || 0;
                sum += v;
                weightedSum += v * i;
            }
            const centroid = sum === 0 ? 0 : weightedSum / sum;

            if (this.onTrigger) {
                this.onTrigger(key, {
                    rms: this.meter.getValue() as number,
                    centroid: centroid
                });
            }
        }
    }
}

export const engine = new AudioEngine();
