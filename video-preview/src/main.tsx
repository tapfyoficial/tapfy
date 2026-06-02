import React, {useRef, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, PlayerRef} from '@remotion/player';
import {TapfyShowcase} from './TapfyShowcase';

const TOTAL_FRAMES = 570;
const COMP_W = 1080;
const COMP_H = 1920;
const PLAYER_H = Math.round((window.innerHeight * 0.88));
const PLAYER_W = Math.round(PLAYER_H * (COMP_W / COMP_H));

function App() {
  const playerRef = useRef<PlayerRef>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      if (!stickyRef.current || !playerRef.current) return;
      const el = stickyRef.current.parentElement!;
      const rect = el.getBoundingClientRect();
      const scrollable = el.offsetHeight - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      const progress = Math.min(1, scrolled / scrollable);
      playerRef.current.seekTo(Math.floor(progress * TOTAL_FRAMES));
    };
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{fontFamily: '-apple-system, sans-serif'}}>
      {/* Scroll-driven section */}
      <div style={{height: '620vh', position: 'relative'}}>
        <div
          ref={stickyRef}
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#030a1a',
            overflow: 'hidden',
          }}
        >
          {/* Background glow rings */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse 70% 60% at 50% 55%, rgba(20,55,150,0.18) 0%, transparent 65%)',
              pointerEvents: 'none',
            }}
          />

          <Player
            ref={playerRef}
            component={TapfyShowcase}
            durationInFrames={TOTAL_FRAMES}
            compositionWidth={COMP_W}
            compositionHeight={COMP_H}
            fps={30}
            style={{
              width: PLAYER_W,
              height: PLAYER_H,
              borderRadius: 0,
            }}
            controls={false}
            loop={false}
            autoPlay={false}
            moveToBeginningWhenEnded={false}
            inputProps={{}}
          />

          {/* Scroll hint */}
          <div
            style={{
              position: 'absolute',
              bottom: 32,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              opacity: 0.45,
              animation: 'bob 2s ease-in-out infinite',
            }}
          >
            <span
              style={{
                color: 'white',
                fontSize: 11,
                letterSpacing: 2.5,
                textTransform: 'uppercase',
                fontWeight: 500,
              }}
            >
              Role para ver
            </span>
            <svg width="16" height="22" viewBox="0 0 16 22" fill="none">
              <rect x="1" y="1" width="14" height="20" rx="7" stroke="white" strokeWidth="1.5" />
              <rect x="6.5" y="5" width="3" height="5" rx="1.5" fill="white" />
            </svg>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
      `}</style>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
