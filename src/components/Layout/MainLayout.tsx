import React, { useRef, useState } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, type PanelImperativeHandle as ImperativePanelHandle } from 'react-resizable-panels';
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
    const inspectorRef = useRef<ImperativePanelHandle>(null);
    const middleBarRef = useRef<ImperativePanelHandle>(null);
    const bottomBarRef = useRef<ImperativePanelHandle>(null);

    const [isInspectorOpen, setIsInspectorOpen] = useState(true);
    const [isMiddleBarOpen, setIsMiddleBarOpen] = useState(true);
    const [isBottomBarOpen, setIsBottomBarOpen] = useState(true);

    const togglePanel = (
        ref: React.RefObject<ImperativePanelHandle | null>,
        isOpen: boolean,
        setIsOpen: (v: boolean) => void
    ) => {
        const panel = ref.current;
        if (!panel) return;

        if (isOpen) {
            panel.collapse();
            setIsOpen(false);
        } else {
            panel.expand();
            setIsOpen(true);
        }
    };

    return (
        <div className={styles.container}>
            <PanelGroup orientation="vertical">
                <Panel defaultSize={50} minSize={20}>
                    <PanelGroup orientation="horizontal">
                        <Panel minSize={30}>
                            <div className={styles.canvasContainer}>
                                {canvasContent || <div className={styles.placeholder}>Visual Canvas Stage</div>}
                                <div className={styles.topControls}>
                                    <button
                                        className={styles.iconButton}
                                        onClick={() => togglePanel(inspectorRef, isInspectorOpen, setIsInspectorOpen)}
                                    >
                                        {isInspectorOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
                                    </button>
                                </div>
                            </div>
                        </Panel>

                        {isInspectorOpen && (
                            <PanelResizeHandle className={styles.resizeHandleHorizontal} />
                        )}

                        <Panel
                            panelRef={inspectorRef}
                            defaultSize={25}
                            minSize={15}
                            collapsible
                            collapsedSize={0}
                            onResize={(size: any) => {
                                const p = typeof size === 'number' ? size : size.asPercentage;
                                setIsInspectorOpen(p > 0);
                            }}
                        >
                            <aside className={styles.inspectorContainer}>
                                {inspectorContent || <div className={styles.placeholder}>Inspector Panel</div>}
                            </aside>
                        </Panel>
                    </PanelGroup>
                </Panel>

                <PanelResizeHandle className={styles.resizeHandleVertical}>
                    <div className={styles.middleBarHeader}>
                        <button className={styles.collapseBtn} onClick={() => togglePanel(middleBarRef, isMiddleBarOpen, setIsMiddleBarOpen)}>
                            <span>Sequencer Loop</span>
                            {isMiddleBarOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                    </div>
                </PanelResizeHandle>

                <Panel
                    panelRef={middleBarRef}
                    defaultSize={20}
                    minSize={10}
                    collapsible
                    collapsedSize={0}
                    onResize={(size: any) => {
                        const p = typeof size === 'number' ? size : size.asPercentage;
                        setIsMiddleBarOpen(p > 0);
                    }}
                >
                    <div className={styles.middleBar}>
                        {middleBarContent || <div className={styles.placeholder}>Sequencer / Looper Region</div>}
                    </div>
                </Panel>

                <PanelResizeHandle className={styles.resizeHandleVertical}>
                    <div className={styles.bottomBarHeader}>
                        <button className={styles.collapseBtn} onClick={() => togglePanel(bottomBarRef, isBottomBarOpen, setIsBottomBarOpen)}>
                            <span>Instrument Map</span>
                            {isBottomBarOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                    </div>
                </PanelResizeHandle>

                <Panel
                    panelRef={bottomBarRef}
                    defaultSize={30}
                    minSize={15}
                    collapsible
                    collapsedSize={0}
                    onResize={(size: any) => {
                        const p = typeof size === 'number' ? size : size.asPercentage;
                        setIsBottomBarOpen(p > 0);
                    }}
                >
                    <div className={styles.bottomBar}>
                        {bottomBarContent || <div className={styles.placeholder}>Keyboard Map / Sampler Engine</div>}
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    );
};
