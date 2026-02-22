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
- [ ] Build 3x8 Keyboard cell grid mapping
- [ ] Implement UI for file drag-and-drop
- [ ] Map global keyboard events to trigger cells (Patatap style)
- [ ] AudioEngine simple playback integration (`Tone.Player`)
**Commit Point**: `feat: drag and drop sample playback map`
**Test**: User can drop an audio file on a cell and press a key to hear it playback immediately.

## Sprint 3: Visual Translation Engine
**Goal**: Create the visual reactiveness layer that responds to the audio.
- [ ] Integrate Audio feature extraction (RMS, Centroid, Zero crossing)
- [ ] Set up visual canvas in the top layer
- [ ] Instantiate basic Transient animations (flashes, scale blobs)
**Commit Point**: `feat: audio-reactive transient visual engine`
**Test**: Pressing a loaded key triggers a synchronized visual animation overlaying the rest of the application.

## Sprint 4: Advanced Synthesis & Sequencing
**Goal**: Introduce Granular synthesis and the Middle Bar looper.
- [ ] Add Granular Mode editor tab in bottom bar
- [ ] Create Record/Loop tracking state (Middle Bar UI)
- [ ] Modifier + Key mapping for loop recording 
**Commit Point**: `feat: granular mode and loop sequencer`
**Test**: User can record a sequence of keystrokes with Shift held, and it plays back continuously.
