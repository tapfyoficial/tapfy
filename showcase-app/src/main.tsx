import React, { useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Player, PlayerRef } from '@remotion/player';
import { TapfyShowcase } from './TapfyShowcase';

const TOTAL_FRAMES = 570;

function App() {
  const playerRef = useRef<PlayerRef>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const el = scrollAreaRef.current;
      if (!el || !playerRef.current) return;
      const rect = el.getBoundingClientRect();
      const scrollable = el.offsetHeight - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      const progress = Math.min(1, scrolled / Math.max(1, scrollable));
      playerRef.current.seekTo(Math.floor(progress * TOTAL_FRAMES));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const ph = Math.round(window.innerHeight * 0.9);
  const pw = Math.round(ph * (1080 / 1920));

  return (
    <>
      {/* scroll area — height controls how long the animation plays */}
      <div ref={scrollAreaRef} style={{ height: '600vh', position: 'relative', background: '#030a1a' }}>
        {/* sticky viewport */}
        <div style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {/* full-bleed background */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 70% 60% at 50% 55%, rgba(20,55,150,0.2) 0%, transparent 65%)',
          }} />

          <Player
            ref={playerRef}
            component={TapfyShowcase}
            durationInFrames={TOTAL_FRAMES}
            compositionWidth={1080}
            compositionHeight={1920}
            fps={30}
            style={{ width: pw, height: ph, position: 'relative', zIndex: 1 }}
            controls={false}
            loop={false}
            autoPlay={false}
            moveToBeginningWhenEnded={false}
            inputProps={{}}
          />

          {/* scroll hint */}
          <div style={{
            position: 'absolute',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            opacity: 0.4,
            animation: 'bob 2s ease-in-out infinite',
            pointerEvents: 'none',
          }}>
            <span style={{ color: 'white', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', fontFamily: '-apple-system, sans-serif' }}>
              Role para ver
            </span>
            <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
              <rect x="1" y="1" width="12" height="18" rx="6" stroke="white" strokeWidth="1.4" />
              <rect x="5.5" y="4.5" width="3" height="4" rx="1.5" fill="white" />
            </svg>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bob {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(5px); }
        }
      `}</style>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
