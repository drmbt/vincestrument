# Sprintboard

## Sprint 1: Architecture & Foundation
**Goal**: Get the scaffolding set up, deployable state, and the main layout grid working.
- [x] Initialize Vite/React repo
- [x] Document the plan and architecture
- [x] Create layout skeleton (Upper canvas, middle bar, bottom bar, inspector)
- [x] Theme configuration (Dark mode, typography, CSS variables)
**Commit Point**: `feat: basic application layout and theme scaffolding`
**Test**: Verify responsive layout resizes correctly in browser dev tools.

## Sprint 2: The Core Instrument (Sampler & Keyboard Map)
**Goal**: Build the keyboard map interface and hook it up to simple sample playback.
- [x] Build 3x8 Keyboard cell grid mapping
- [x] Implement UI for file drag-and-drop
- [x] Map global keyboard events to trigger cells (Patatap style)
- [x] AudioEngine simple playback integration (`Tone.Player`)
**Commit Point**: `feat: drag and drop sample playback map`
**Test**: User can drop an audio file on a cell and press a key to hear it playback immediately.

## Sprint 3: Visual Translation Engine
**Goal**: Create the visual reactiveness layer that responds to the audio.
- [x] Integrate Audio feature extraction (RMS, Centroid, Zero crossing)
- [x] Set up visual canvas in the top layer
- [x] Instantiate basic Transient animations (flashes, scale blobs)
**Commit Point**: `feat: audio-reactive transient visual engine`
**Test**: Pressing a loaded key triggers a synchronized visual animation overlaying the rest of the application.

## Sprint 4: Advanced Synthesis & Sequencing
**Goal**: Introduce Granular synthesis and the Middle Bar looper.
- [x] Add Granular Mode editor tab in bottom bar
- [x] Create Record/Loop tracking state (Middle Bar UI)
- [x] Modifier + Key mapping for loop recording 
**Commit Point**: `feat: granular mode and loop sequencer`
**Test**: User can record a sequence of keystrokes with Shift held, and it plays back continuously.

## Sprint 5: Polish & Sustained Visuals
**Goal**: Finalize visual engine, add analytical data to the inspector, and polish.
- [x] Add sustained particle/texture background to VisualCanvas
- [x] Create Analytical Inspector widgets (RMS meter, FFT display)
- [x] Final UI/UX review
**Commit Point**: `feat: analytical inspector and sustained visuals`
**Test**: Inspector shows real-time frequency data, visual canvas reacts continuously.

## Sprint 6: Ableton-style Sample Editor & Granular Fix
**Goal**: Implement a fully featured Sample Editor tab and fix granular synthesis playback.
- [x] Refactor Bottom Bar to support tabs ('Keyboard Map', 'Sample Editor')
- [x] Create `SampleEditor` component displaying full waveform for the selected key's sample
- [x] Implement interactive trim controls (start/end) on the waveform
- [x] Debug and fix Granular synthesis playback issues (ensure grain buffer is processing correctly)
**Commit Point**: `feat: full sample editor and granular fix`
**Test**: User can switch to Sample Editor tab, see waveform, adjust trim, and granular playback works.
