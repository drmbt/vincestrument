import React, { useState } from 'react';
import { PanelRightClose, PanelRightOpen, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
    canvasContent?: React.ReactNode;
    inspectorContent?: React.ReactNode;
    middleBarContent?: React.ReactNode;
    bottomBarContent?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    canvasContent,
    inspectorContent,
    middleBarContent,
    bottomBarContent
}) => {
    const [isInspectorOpen, setIsInspectorOpen] = useState(true);
    const [isBottomBarOpen, setIsBottomBarOpen] = useState(true);
    const [isMiddleBarOpen, setIsMiddleBarOpen] = useState(true);

    return (
        <div className={styles.container}>
            {/* Top Section: Canvas and Inspector */}
            <div className={styles.topSection}>
                <div className={styles.canvasContainer}>
                    {canvasContent || <div className={styles.placeholder}>Visual Canvas Stage</div>}
                    <div className={styles.topControls}>
                        <button className={styles.iconButton} onClick={() => setIsInspectorOpen(!isInspectorOpen)}>
                            {isInspectorOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
                        </button>
                    </div>
                </div>

                {isInspectorOpen && (
                    <aside className={styles.inspectorContainer}>
                        {inspectorContent || <div className={styles.placeholder}>Inspector Panel</div>}
                    </aside>
                )}
            </div>

            {/* Middle Bar: Sequencer/Looper */}
            <div className={styles.middleBarHeader}>
                <button className={styles.collapseBtn} onClick={() => setIsMiddleBarOpen(!isMiddleBarOpen)}>
                    <span>Sequencer Loop</span>
                    {isMiddleBarOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
            </div>
            {isMiddleBarOpen && (
                <div className={styles.middleBar}>
                    {middleBarContent || <div className={styles.placeholder}>Sequencer / Looper Region</div>}
                </div>
            )}

            {/* Bottom Bar: Tabs, Keyboard Map, Sampler */}
            <div className={styles.bottomBarHeader}>
                <button className={styles.collapseBtn} onClick={() => setIsBottomBarOpen(!isBottomBarOpen)}>
                    <span>Instrument Map</span>
                    {isBottomBarOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
            </div>
            {isBottomBarOpen && (
                <div className={styles.bottomBar}>
                    {bottomBarContent || <div className={styles.placeholder}>Keyboard Map / Sampler Engine</div>}
                </div>
            )}
        </div>
    );
};
