'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import ProductVideo from './ProductVideo';
import styles from '../marketing.module.css';

// @remotion/player is browser-only — load it without SSR.
const Player = dynamic(() => import('@remotion/player').then((m) => m.Player), { ssr: false });

const DURATION = 510;

/**
 * Scroll-scrubbed product video: a tall section pins the video frame and the
 * Remotion timeline is driven by how far you've scrolled through it.
 */
export default function WelcomeVideo() {
  const sceneRef = useRef(null);
  const playerRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = scene.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const total = rect.height - vh; // scrollable distance while the frame is pinned
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      setProgress(p);
      const player = playerRef.current;
      if (player) {
        const frame = Math.round(p * (DURATION - 1));
        try {
          player.pause?.();
          player.seekTo?.(frame);
        } catch {
          /* player not ready yet */
        }
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div ref={sceneRef} className={styles.scrollScene}>
      <div className={styles.scrollSticky}>
        <div className={styles.videoFrame}>
          <Player
            ref={playerRef}
            component={ProductVideo}
            durationInFrames={DURATION}
            fps={30}
            compositionWidth={1280}
            compositionHeight={720}
            style={{ width: '100%', height: '100%' }}
            controls={false}
            clickToPlay={false}
            showVolumeControls={false}
            acknowledgeRemotionLicense
            renderLoading={() => (
              <div style={{ position: 'absolute', inset: 0, background: '#f7f5f1' }} />
            )}
          />
          <div className={styles.scrubBar}>
            <span style={{ transform: `scaleX(${progress})` }} />
          </div>
          <div className={styles.scrubHint} style={{ opacity: progress > 0.03 ? 0 : 1 }}>
            Scroll to play ↓
          </div>
        </div>
      </div>
    </div>
  );
}
