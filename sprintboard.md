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

## Sprint 7: Advanced Sequencer & Dynamic UI
**Goal**: Build a multi-lane Ableton-style sequencer, add piano mode, and make the UI resizable.
- [x] Implement resizable split panes for all main UI containers (Inspector, Bottom Bar, Middle Bar).
- [x] Load 24 unique default samples and add transposition controls.
- [x] Implement "Piano Mode" (listen to key up/down for note start/end events).
- [x] Overhaul Sequencer: Add Tempo, Start/Stop, Quantization, and Beat Grids.
- [x] Multi-lane Sequencer UI: One lane per key, with draggable, stretchable, and snappable note regions.
- [ ] Per-note pitching and stretching within the sequencer lanes.
**Commit Point**: `feat: advanced multi-lane sequencer and resizable ui`
**Test**: User can resize windows, play notes with lengths depending on key hold, record them into a multi-lane sequencer, and edit the notes via drag/drop/stretch.

## Sprint 8: Sequencing Depth & Visual Selection
**Goal**: Bring deep interaction to the sequencer and revive the visualizer with new modes.
- [x] Sequencer Region Selection: Click to select, Delete key to remove.
- [x] Sequencer Alt-Drag: Copy regions in the timeline.
- [x] Beat Grid Graticule: Visible subdivision lines over the sequencer background.
- [x] Region Properties: Show region-specific pitch/crop in the Sample Editor when a region is selected.
- [x] Keyboard Map Drag-Drop: Alt-drag from one key to another to duplicate the instrument.
- [x] Multi-Mode Visualizer: Implement Oscilloscope, FFT, and a third visual mode in the top-left canvas.

## Sprint 9: High Contrast Terminal Aesthetic
**Goal**: Overhaul the visual design to a minimal, high-contrast terminal look and make the sequencer grid more pronounced.
- [x] Implement deep black background and terminal green/amber accents in `index.css`.
- [x] Switch global UI fonts to monospaced variants.
- [x] Enhance MiddleBarLooper grid graticule to be significantly more visible with solid, contrasting lines for beats and subdivisions.
- [x] Update buttons, borders, and visualizer UI to match the minimal terminal aesthetic.

## Sprint 10: Saving & Loading State
**Goal**: Implement robust state management allowing users to save their custom sample maps and sequencer regions to `localStorage`.
- [x] Implement `serializeState` and `loadState` in the AudioEngine to manage JSON exports of all cells and regions.
- [x] Create `ProjectControls.tsx` component with Save/Load icons.
- [x] Integrate the new controls into the `MainLayout` top header.

## Sprint 11: Global Audio Effects
**Goal**: Enhance the sound engine with global Reverb and Delay busses, controlled via the UI Inspector.
- [x] Initialize `Tone.Reverb` and `Tone.PingPongDelay` in AudioEngine.
- [x] Route all SampleCells to these global effect busses.
- [x] Build `MasterEffectsPanel.tsx` and place it in the Right Inspector.
