import React from 'react';
import { Save, FolderOpen } from 'lucide-react';
import { engine } from '../../core/AudioEngine';
import styles from './ProjectControls.module.css';

const SAVE_KEY = 'vincestrument_save_slot_1';

export const ProjectControls: React.FC = () => {
    const handleSave = () => {
        const stateStr = engine.serializeState();
        localStorage.setItem(SAVE_KEY, stateStr);
        alert('vincestrument: Project Saved to localStorage!');
    };

    const handleLoad = async () => {
        const stateStr = localStorage.getItem(SAVE_KEY);
        if (stateStr) {
            try {
                await engine.loadState(stateStr);
                // alert('vincestrument: Project Loaded successfully!');
            } catch (e) {
                alert('vincestrument: Failed to load project.');
                console.error(e);
            }
        } else {
            alert('vincestrument: No saved project found. Save a project first!');
        }
    };

    return (
        <div className={styles.container}>
            <button className={styles.iconButton} onClick={handleLoad} title="Load Project">
                <FolderOpen size={18} />
            </button>
            <button className={styles.iconButton} onClick={handleSave} title="Save Project">
                <Save size={18} />
            </button>
        </div>
    );
};
