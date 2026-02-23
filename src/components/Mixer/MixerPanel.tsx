import React from 'react';
import { ChannelStrip } from './ChannelStrip';
import styles from './MixerPanel.module.css';

const KEYS = [
    'q', 'w', 'e', 'r', 't', 'y', 'u', 'i',
    'a', 's', 'd', 'f', 'g', 'h', 'j', 'k',
    'z', 'x', 'c', 'v', 'b', 'n', 'm', ','
];

export const MixerPanel: React.FC = () => {
    return (
        <div className={styles.container}>
            <div className={styles.scrollWrapper}>
                {KEYS.map(key => (
                    <ChannelStrip key={key} keyId={key} />
                ))}
            </div>
        </div>
    );
};
