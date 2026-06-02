import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ─── Utility ──────────────────────────────────────────────────────────────────
const ci = (
  frame: number,
  input: number[],
  output: number[],
) =>
  interpolate(frame, input, output, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#030509',
  bgBlue: '#060d1f',
  blueGlow: '#1a4aff',
  phone: '#1e1e22',
  phoneEdge: '#45454a',
  screen: '#000',
  card: '#0b0b0b',
  gB: '#4285F4',
  gR: '#EA4335',
  gY: '#FBBC05',
  gG: '#34A853',
  pub: '#1a73e8',
  ok: '#34A853',
};

// ─── Timeline ─────────────────────────────────────────────────────────────────
// Total: 540 frames = 18 s @ 30 fps
const T = {
  iphoneIn: 0,          // iPhone springs in
  cardIn: 75,           // Card enters from top
  cardReach: 165,       // Card is behind iPhone top
  nfcStart: 178,        // NFC ripples start
  islandOpen: 205,      // Dynamic Island expands
  islandFull: 242,      // Island fully open
  islandTap: 265,       // Tap animation
  reviewOpen: 285,      // Screen → Google Review
  star1: 315, star2: 338, star3: 358, star4: 378, star5: 398,
  textIn: 412,
  publishPress: 450,
  successIn: 472,
  cornerCardIn: 498,
  end: 540,
};

// ─── Google ring (SVG) ────────────────────────────────────────────────────────
const GoogleRing: React.FC<{size: number}> = ({size}) => {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const segments = [
    {color: C.gB, offset: 0.00, pct: 0.42},
    {color: C.gR, offset: 0.42, pct: 0.24},
    {color: C.gY, offset: 0.66, pct: 0.19},
    {color: C.gG, offset: 0.85, pct: 0.15},
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{position: 'absolute', top: 0, left: 0}}
    >
      {segments.map(({color, offset, pct}) => (
        <circle
          key={color}
          cx={50}
          cy={50}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={5.5}
          strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
          strokeDashoffset={-offset * circ}
          style={{transform: 'rotate(-90deg)', transformOrigin: '50px 50px'}}
        />
      ))}
    </svg>
  );
};

// ─── Google wordmark ──────────────────────────────────────────────────────────
const GWord: React.FC<{size: number}> = ({size}) => (
  <span style={{fontFamily: 'Arial, sans-serif', fontSize: size, fontWeight: 700, lineHeight: 1}}>
    <span style={{color: C.gB}}>G</span>
    <span style={{color: C.gR}}>o</span>
    <span style={{color: C.gY}}>o</span>
    <span style={{color: C.gB}}>g</span>
    <span style={{color: C.gG}}>l</span>
    <span style={{color: C.gR}}>e</span>
  </span>
);

// ─── Star ─────────────────────────────────────────────────────────────────────
const Star: React.FC<{filled: boolean; size?: number}> = ({filled, size = 30}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill={filled ? C.gY : 'none'}
      stroke={filled ? C.gY : '#bbb'}
      strokeWidth={1.5}
    />
  </svg>
);

// ─── Tapfy Card ───────────────────────────────────────────────────────────────
const TapfyCard: React.FC<{
  style?: React.CSSProperties;
  mini?: boolean;
}> = ({style, mini = false}) => {
  const W = mini ? 130 : 230;
  const H = mini ? 205 : 364;
  const ring = mini ? 90 : 164;
  const ringOffset = mini ? -5 : 0;

  return (
    <div
      style={{
        width: W,
        height: H,
        borderRadius: mini ? 12 : 20,
        background: 'linear-gradient(160deg, #141414 0%, #0b0b0b 60%, #111 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.9), 0 0 40px rgba(26,74,255,0.18)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: mini ? '16px 12px 12px' : '26px 18px 18px',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* Google ring + text */}
      <div style={{
        position: 'relative',
        width: ring,
        height: ring,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: ringOffset,
      }}>
        <GoogleRing size={ring} />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          zIndex: 1,
        }}>
          <span style={{
            color: 'rgba(255,255,255,0.8)',
            fontFamily: 'Arial, sans-serif',
            fontSize: mini ? 9 : 13,
            fontWeight: 400,
          }}>Avalie no</span>
          <GWord size={mini ? 17 : 24} />
        </div>
      </div>

      {/* NFC icon + label */}
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5}}>
        {/* NFC wave icon (SVG) */}
        <svg width={mini ? 38 : 56} height={mini ? 38 : 56} viewBox="0 0 60 60" fill="none">
          <circle cx="22" cy="30" r="14" stroke="white" strokeWidth="2.5"/>
          <path d="M32 20 Q40 30 32 40" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M38 15 Q50 30 38 45" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <rect x="36" y="12" width="14" height="26" rx="3.5" stroke="white" strokeWidth="2.2"/>
          <line x1="40" y1="35" x2="46" y2="35" stroke="white" strokeWidth="2"/>
        </svg>
        {!mini && (
          <span style={{
            color: 'rgba(255,255,255,0.65)',
            fontFamily: 'Arial, sans-serif',
            fontSize: 8.5,
            letterSpacing: 2.5,
            fontWeight: 600,
          }}>APROXIME SEU CELULAR</span>
        )}
      </div>

      {/* tapfy. */}
      <span style={{
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: mini ? 14 : 20,
        fontWeight: 700,
        letterSpacing: 0.5,
      }}>tapfy.</span>
    </div>
  );
};

// ─── Screen contents ──────────────────────────────────────────────────────────

const LockScreen: React.FC = () => (
  <div style={{
    width: '100%',
    height: '100%',
    background: 'linear-gradient(160deg, #111826 0%, #080c14 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 68,
    fontFamily: 'Arial, sans-serif',
  }}>
    <div style={{color: 'rgba(255,255,255,0.93)', fontSize: 60, fontWeight: 100, letterSpacing: -2}}>9:41</div>
    <div style={{color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 3}}>Segunda-feira, 2 de junho</div>
  </div>
);

const ReviewScreen: React.FC<{
  filled: number;
  showText: boolean;
  pressing: boolean;
}> = ({filled, showText, pressing}) => (
  <div style={{
    width: '100%',
    height: '100%',
    background: '#fff',
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    padding: '58px 18px 16px',
    boxSizing: 'border-box',
  }}>
    <div style={{marginBottom: 10}}>
      <div style={{fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1.3}}>Sua Empresa</div>
      <div style={{fontSize: 12, color: '#555', lineHeight: 1.5}}>Sua Empresa</div>
      <div style={{fontSize: 11, color: '#888'}}>Rua das Flores, 123 · Centro</div>
    </div>
    <div style={{display: 'flex', gap: 4, marginBottom: 12}}>
      {[1, 2, 3, 4, 5].map(n => <Star key={n} filled={n <= filled} size={28} />)}
    </div>
    <div style={{
      flex: 1,
      border: '1px solid #e0e0e0',
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
      fontSize: 12,
      color: showText ? '#111' : '#bbb',
      background: '#fafafa',
      lineHeight: 1.5,
    }}>
      {showText
        ? 'Atendimento excelente e\nexperiência incrível!'
        : 'Compartilhe detalhes da sua\nexperiência neste local'}
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: 5, color: C.pub, fontSize: 12, marginBottom: 10}}>
      <span style={{fontSize: 14}}>📷</span> Adicionar fotos
    </div>
    <div style={{
      background: C.pub,
      borderRadius: 6,
      padding: '11px',
      textAlign: 'center',
      color: 'white',
      fontSize: 13,
      fontWeight: 600,
      transform: pressing ? 'scale(0.96)' : 'scale(1)',
    }}>
      Publicar
    </div>
  </div>
);

const SuccessOverlay: React.FC<{opacity: number}> = ({opacity}) => (
  <div style={{
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.84)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    opacity,
    zIndex: 10,
  }}>
    <div style={{
      width: 68,
      height: 68,
      borderRadius: '50%',
      border: `3.5px solid ${C.ok}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: C.ok,
      fontSize: 34,
    }}>✓</div>
    <div style={{color: '#fff', fontSize: 17, fontWeight: 700, textAlign: 'center', fontFamily: 'Arial, sans-serif'}}>
      Avaliação enviada!
    </div>
    <div style={{color: 'rgba(255,255,255,0.55)', fontSize: 11.5, textAlign: 'center', fontFamily: 'Arial, sans-serif', lineHeight: 1.6}}>
      Obrigado por compartilhar{'\n'}sua experiência.
    </div>
  </div>
);

// ─── Dynamic Island ───────────────────────────────────────────────────────────
const Island: React.FC<{expandProg: number; showContent: boolean; tapProg: number}> = ({
  expandProg,
  showContent,
  tapProg,
}) => {
  const w = ci(expandProg, [0, 1], [108, 275]);
  const h = ci(expandProg, [0, 1], [31, 78]);
  const tapScale = ci(tapProg, [0, 0.5, 1], [1, 0.94, 1]);
  const contentOpacity = ci(expandProg, [0.55, 1], [0, 1]);

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      left: '50%',
      transform: `translateX(-50%) scale(${tapScale})`,
      width: w,
      height: h,
      background: '#000',
      borderRadius: h,
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      zIndex: 20,
      boxShadow: expandProg > 0.3
        ? `0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.6)`
        : 'none',
    }}>
      {showContent && (
        <div style={{
          opacity: contentOpacity,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '0 12px',
          width: '100%',
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{color: C.gB, fontFamily: 'Arial, sans-serif', fontSize: 15, fontWeight: 700, lineHeight: 1}}>G</span>
          </div>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{color: '#fff', fontSize: 11, fontFamily: 'Arial, sans-serif', fontWeight: 600, lineHeight: 1.3}}>
              Avaliar no Google
            </div>
            <div style={{color: '#777', fontSize: 9.5, fontFamily: 'Arial, sans-serif', lineHeight: 1.3}}>
              Toque para abrir
            </div>
          </div>
          <div style={{color: '#666', fontSize: 9.5, fontFamily: 'Arial, sans-serif', flexShrink: 0}}>agora</div>
        </div>
      )}
    </div>
  );
};

// ─── iPhone mockup ────────────────────────────────────────────────────────────
const IPhone: React.FC<{
  glow: number;
  islandExpand: number;
  showIslandContent: boolean;
  islandTap: number;
  screenContent: React.ReactNode;
  floatY: number;
  entryY: number;
  entryOpacity: number;
}> = ({glow, islandExpand, showIslandContent, islandTap, screenContent, floatY, entryY, entryOpacity}) => {
  const W = 330;
  const H = 678;

  return (
    <div style={{
      position: 'relative',
      width: W,
      height: H,
      opacity: entryOpacity,
      transform: `perspective(1400px) rotateY(12deg) rotateX(-3deg) translateY(${entryY + floatY}px)`,
    }}>
      {/* Ground glow */}
      <div style={{
        position: 'absolute',
        bottom: -80,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 520,
        height: 130,
        background: `radial-gradient(ellipse, rgba(26,74,255,${0.55 * glow}) 0%, transparent 70%)`,
        filter: 'blur(16px)',
        pointerEvents: 'none',
      }}/>

      {/* Body */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(170deg, #3a3a3e 0%, ${C.phone} 30%, #141416 65%, ${C.phone} 100%)`,
        borderRadius: 50,
        boxShadow: [
          'inset 0 0 0 0.5px rgba(255,255,255,0.12)',
          '0 0 0 1px rgba(0,0,0,0.9)',
          '0 40px 80px rgba(0,0,30,0.95)',
          `0 0 50px rgba(26,74,255,${0.28 * glow})`,
        ].join(', '),
      }}>
        {/* Screen area */}
        <div style={{
          position: 'absolute',
          inset: 13,
          background: C.screen,
          borderRadius: 38,
          overflow: 'hidden',
        }}>
          {/* Status bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 52,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '14px 20px 0',
            zIndex: 15,
          }}>
            <span style={{color: 'rgba(255,255,255,0.9)', fontFamily: 'Arial, sans-serif', fontSize: 13, fontWeight: 600}}>9:41</span>
            <div style={{display: 'flex', gap: 4, alignItems: 'center', paddingTop: 2}}>
              {/* Signal dots */}
              {[4, 3.5, 3, 2.5].map((h, i) => (
                <div key={i} style={{width: 3, height: h, background: 'rgba(255,255,255,0.85)', borderRadius: 1}}/>
              ))}
              <div style={{width: 12, height: 8, border: '1.5px solid rgba(255,255,255,0.8)', borderRadius: 2, marginLeft: 2, position: 'relative'}}>
                <div style={{position: 'absolute', right: -3, top: 2, width: 2, height: 4, background: 'rgba(255,255,255,0.5)', borderRadius: 1}}/>
                <div style={{position: 'absolute', inset: 1.5, background: 'rgba(255,255,255,0.85)', borderRadius: 1}}/>
              </div>
            </div>
          </div>

          {/* Screen content */}
          {screenContent}

          {/* Dynamic Island */}
          <Island
            expandProg={islandExpand}
            showContent={showIslandContent}
            tapProg={islandTap}
          />

          {/* Lock screen bottom buttons */}
          {islandExpand < 0.05 && (
            <div style={{
              position: 'absolute',
              bottom: 26,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0 36px',
            }}>
              {/* Torch */}
              <div style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: 8,
                  height: 20,
                  background: 'rgba(255,255,255,0.8)',
                  borderRadius: 4,
                  boxShadow: '0 0 8px rgba(255,255,255,0.6)',
                }}/>
              </div>
              {/* Camera */}
              <div style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: 22,
                  height: 18,
                  border: '2px solid rgba(255,255,255,0.8)',
                  borderRadius: 4,
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: -5,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 8,
                    height: 4,
                    background: 'rgba(255,255,255,0.8)',
                    borderRadius: '2px 2px 0 0',
                  }}/>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side power button */}
        <div style={{
          position: 'absolute',
          right: -3.5,
          top: 150,
          width: 4,
          height: 82,
          background: C.phoneEdge,
          borderRadius: '0 3px 3px 0',
        }}/>
        {/* Volume up */}
        <div style={{
          position: 'absolute',
          left: -3.5,
          top: 108,
          width: 4,
          height: 38,
          background: C.phoneEdge,
          borderRadius: '3px 0 0 3px',
        }}/>
        {/* Volume down */}
        <div style={{
          position: 'absolute',
          left: -3.5,
          top: 158,
          width: 4,
          height: 38,
          background: C.phoneEdge,
          borderRadius: '3px 0 0 3px',
        }}/>
        {/* Silent toggle */}
        <div style={{
          position: 'absolute',
          left: -3.5,
          top: 72,
          width: 4,
          height: 28,
          background: C.phoneEdge,
          borderRadius: '3px 0 0 3px',
        }}/>
      </div>
    </div>
  );
};

// ─── NFC ripple ───────────────────────────────────────────────────────────────
const Ripple: React.FC<{cx: number; cy: number; frame: number; delay: number}> = ({cx, cy, frame, delay}) => {
  const f = frame - delay;
  const opacity = ci(f, [0, 8, 45], [0, 0.55, 0]);
  const scale = ci(f, [0, 45], [0.25, 2.2]);
  if (opacity <= 0) return null;
  return (
    <div style={{
      position: 'absolute',
      left: cx - 44,
      top: cy - 44,
      width: 88,
      height: 88,
      borderRadius: '50%',
      border: `2px solid ${C.blueGlow}`,
      opacity,
      transform: `scale(${scale})`,
      pointerEvents: 'none',
    }}/>
  );
};

// ─── Main composition ─────────────────────────────────────────────────────────
export const TapfyNFCDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const cx = width / 2;
  const cy = height / 2;

  // ── iPhone ─────────────────────────────────────────────────────────────────
  const iphoneSp = spring({fps, frame, config: {damping: 70, stiffness: 90}});
  const iphoneEntryY = ci(iphoneSp, [0, 1], [120, 0]);
  const iphoneOpacity = ci(iphoneSp, [0, 0.3], [0, 1]);
  const iphoneGlow = ci(frame, [20, 70], [0, 1]);

  // Float: slow sine approximated with 5 keyframes
  const floatY = ci(frame, [30, 90, 150, 210, 270, 330, 390, 450, 540],
                           [0, -14, 0, -14, 0, -14, 0, -14, 0]);

  // ── Dynamic Island ─────────────────────────────────────────────────────────
  const islandExpand = ci(frame, [T.islandOpen, T.islandFull], [0, 1]);
  const showIslandContent = frame >= T.islandOpen + 12;
  const tapProg = ci(frame, [T.islandTap, T.islandTap + 20], [0, 1]);

  // ── Screen content ─────────────────────────────────────────────────────────
  const filledStars = [T.star1, T.star2, T.star3, T.star4, T.star5]
    .filter(f => frame >= f + 18).length;
  const showText = frame >= T.textIn;
  const pressing = frame >= T.publishPress && frame < T.publishPress + 20;
  const successOp = ci(frame, [T.successIn, T.successIn + 35], [0, 1]);

  let screenContent: React.ReactNode;
  if (frame < T.reviewOpen + 15) {
    screenContent = <LockScreen />;
  } else if (frame < T.successIn) {
    const slideUp = ci(frame, [T.reviewOpen + 15, T.reviewOpen + 45], [100, 0]);
    screenContent = (
      <div style={{transform: `translateY(${slideUp}%)`, height: '100%'}}>
        <ReviewScreen filled={filledStars} showText={showText} pressing={pressing} />
      </div>
    );
  } else {
    screenContent = (
      <>
        <ReviewScreen filled={5} showText pressing={false} />
        <SuccessOverlay opacity={successOp} />
      </>
    );
  }

  // ── Card ───────────────────────────────────────────────────────────────────
  const cardSp = spring({fps, frame: Math.max(0, frame - T.cardIn), config: {damping: 55, stiffness: 70}});
  // Card descends from y = -350 to y = cy - 325 (just above/touching phone top)
  const cardTopY = cy - 325;
  const cardY = ci(cardSp, [0, 1], [-350, cardTopY]);
  const cardX = cx + 18; // slight offset to show going behind phone
  const cardOpacity = ci(frame, [T.cardIn, T.cardIn + 18], [0, 1]);
  const cardTiltX = ci(frame, [T.cardIn, T.cardReach], [25, 0]);
  // Card recedes after NFC
  const cardGoAway = ci(frame, [T.nfcStart + 25, T.nfcStart + 65], [0, 1]);
  const cardFinalY = ci(cardGoAway, [0, 1], [cardY, -450]);
  const cardFinalOp = ci(cardGoAway, [0, 1], [cardOpacity, 0]);

  // ── BG glow ────────────────────────────────────────────────────────────────
  const bgGlow = ci(frame, [0, 60], [0, 1]);

  // ── Corner card (end) ─────────────────────────────────────────────────────
  const cornerSp = spring({fps, frame: Math.max(0, frame - T.cornerCardIn), config: {damping: 80, stiffness: 120}});
  const cornerOp = ci(frame, [T.cornerCardIn, T.cornerCardIn + 20], [0, 1]);

  return (
    <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
      {/* ── Deep background gradient ── */}
      <AbsoluteFill style={{
        background: 'radial-gradient(ellipse 90% 70% at 50% 100%, #060d1f 0%, #030509 60%)',
      }}/>

      {/* ── Blue floor glow ── */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 900,
        height: 340,
        background: `radial-gradient(ellipse, rgba(26,74,255,${0.30 * bgGlow}) 0%, transparent 70%)`,
        filter: 'blur(10px)',
      }}/>

      {/* ── Vignette ── */}
      <AbsoluteFill style={{
        background: 'radial-gradient(ellipse 110% 110% at 50% 50%, transparent 50%, rgba(0,0,0,0.55) 100%)',
        pointerEvents: 'none',
      }}/>

      {/* ── NFC ripples ── */}
      {frame >= T.nfcStart && frame <= T.nfcStart + 75 && (
        <>
          <Ripple cx={cardX} cy={cy - 282} frame={frame} delay={T.nfcStart} />
          <Ripple cx={cardX} cy={cy - 282} frame={frame} delay={T.nfcStart + 18} />
          <Ripple cx={cardX} cy={cy - 282} frame={frame} delay={T.nfcStart + 36} />
        </>
      )}

      {/* ── iPhone ── */}
      <div style={{
        position: 'absolute',
        left: cx - 165,
        top: cy - 339,
      }}>
        <IPhone
          glow={iphoneGlow}
          islandExpand={islandExpand}
          showIslandContent={showIslandContent}
          islandTap={tapProg}
          screenContent={screenContent}
          floatY={floatY}
          entryY={iphoneEntryY}
          entryOpacity={iphoneOpacity}
        />
      </div>

      {/* ── Tapfy card (coming from above) ── */}
      {frame >= T.cardIn && (
        <div style={{
          position: 'absolute',
          left: cardX - 115,
          top: cardFinalY,
          opacity: cardFinalOp,
          transform: `perspective(1400px) rotateX(${cardTiltX}deg) rotateY(8deg)`,
          zIndex: 3,
        }}>
          <TapfyCard />
        </div>
      )}

      {/* ── Corner card at success ── */}
      {frame >= T.cornerCardIn && (
        <div style={{
          position: 'absolute',
          right: 90,
          bottom: 50,
          opacity: cornerOp,
          transform: `scale(${ci(cornerSp, [0, 1], [0.5, 1])}) rotate(-8deg)`,
          zIndex: 5,
        }}>
          <TapfyCard mini />
        </div>
      )}

      {/* ── tapfy. watermark ── */}
      <div style={{
        position: 'absolute',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.18)',
        fontFamily: 'Arial, sans-serif',
        fontSize: 15,
        letterSpacing: 3,
        opacity: ci(frame, [40, 70], [0, 1]),
      }}>
        tapfy.
      </div>
    </AbsoluteFill>
  );
};
