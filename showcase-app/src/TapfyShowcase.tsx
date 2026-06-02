import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  Sequence,
} from 'remotion';

// ─── Timing map (30fps) ──────────────────────────────────────────
const T = {
  IPHONE_IN: 0,          // iPhone fades/scales in
  CARD_ENTER: 65,        // Card drops from top
  CARD_LAND: 140,        // Card reaches NFC zone
  NFC_START: 148,        // NFC pulse waves
  ISLAND_EXPAND: 178,    // Dynamic Island grows
  ISLAND_TEXT_IN: 202,   // Notification text appears
  TAP_RIPPLE: 258,       // Tap notification
  REVIEW_SLIDE: 300,     // Google review page slides up
  REVIEW_IN: 345,        // Review page settled
  STARS_START: 350,      // Stars fill in one by one
  TEXT_START: 415,       // Review text types in
  TEXT_END: 452,
  PUBLISH_TAP: 460,
  SUCCESS_IN: 480,
  TOTAL: 570,
};

// ─── Colors ─────────────────────────────────────────────────────
const C = {
  bg: '#030a1a',
  gBlue: '#4285F4',
  gRed: '#EA4335',
  gYellow: '#FBBC05',
  gGreen: '#34A853',
};

// ─── Animated Background ─────────────────────────────────────────
const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.sin((frame / 30) * Math.PI * 0.6);
  const a1 = 0.22 + pulse * 0.04;
  const a2 = 0.12 + pulse * 0.02;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 75% 65% at 50% 55%,
          rgba(20,60,160,${a1}) 0%,
          rgba(10,30,90,${a2}) 40%,
          ${C.bg} 75%)`,
      }}
    />
  );
};

// ─── Ground Glow ─────────────────────────────────────────────────
const GroundGlow: React.FC<{ floatY: number }> = ({ floatY }) => (
  <div
    style={{
      position: 'absolute',
      bottom: 220 + floatY * 0.4,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 520,
      height: 50,
      background: 'radial-gradient(ellipse, rgba(30,80,220,0.45) 0%, transparent 70%)',
      filter: 'blur(24px)',
      pointerEvents: 'none',
    }}
  />
);

// ─── iOS-style wallpaper ─────────────────────────────────────────
const Wallpaper: React.FC = () => (
  <AbsoluteFill style={{ background: '#111' }}>
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 460 940"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="wg" cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#2a2a38" />
          <stop offset="100%" stopColor="#0d0d12" />
        </radialGradient>
      </defs>
      <rect width="460" height="940" fill="url(#wg)" />
      <ellipse cx="210" cy="340" rx="195" ry="310" fill="rgba(35,35,55,0.55)" transform="rotate(-18 210 340)" />
      <ellipse cx="310" cy="620" rx="145" ry="240" fill="rgba(25,25,42,0.4)" transform="rotate(12 310 620)" />
      <ellipse cx="120" cy="700" rx="100" ry="160" fill="rgba(20,20,35,0.3)" transform="rotate(-8 120 700)" />
    </svg>
  </AbsoluteFill>
);

// ─── Status Bar ──────────────────────────────────────────────────
const StatusBar: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 30,
      paddingRight: 26,
      zIndex: 30,
    }}
  >
    <span
      style={{
        color: 'white',
        fontSize: 18,
        fontWeight: 600,
        fontFamily: '-apple-system, SF Pro Display, sans-serif',
        letterSpacing: -0.3,
      }}
    >
      9:41
    </span>
    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
      {/* Signal */}
      <svg width="19" height="14" viewBox="0 0 19 14">
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={i * 4.8}
            y={14 - (i + 1) * 3.2}
            width={3.5}
            height={(i + 1) * 3.2}
            rx={1}
            fill="white"
            opacity={i === 0 ? 0.35 : 1}
          />
        ))}
      </svg>
      {/* WiFi */}
      <svg width="17" height="13" viewBox="0 0 17 13">
        <circle cx="8.5" cy="12" r="1.5" fill="white" />
        <path d="M5.2 8.8 Q8.5 6.5 11.8 8.8" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M2.2 5.8 Q8.5 1.5 14.8 5.8" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {/* Battery */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <div
          style={{
            width: 26,
            height: 13,
            border: '1.5px solid rgba(255,255,255,0.9)',
            borderRadius: 3.5,
            padding: '2px',
          }}
        >
          <div
            style={{
              width: '78%',
              height: '100%',
              background: 'white',
              borderRadius: 1.5,
            }}
          />
        </div>
        <div
          style={{
            width: 2,
            height: 5,
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '0 1px 1px 0',
          }}
        />
      </div>
    </div>
  </div>
);

// ─── Dynamic Island ───────────────────────────────────────────────
interface IslandProps {
  expandProgress: number;
  textOpacity: number;
  tapProgress: number;
}

const DynamicIsland: React.FC<IslandProps> = ({
  expandProgress,
  textOpacity,
  tapProgress,
}) => {
  const w = interpolate(expandProgress, [0, 1], [126, 340]);
  const h = interpolate(expandProgress, [0, 1], [38, 86]);
  const br = interpolate(expandProgress, [0, 1], [20, 28]);
  const tapScale = interpolate(tapProgress, [0, 0.5, 1], [1, 0.96, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 13,
        left: '50%',
        transform: `translateX(-50%) scale(${tapScale})`,
        width: w,
        height: h,
        borderRadius: br,
        background: '#000',
        zIndex: 40,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 10,
        paddingRight: 12,
        gap: 10,
      }}
    >
      <div style={{ opacity: textOpacity, display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
        {/* Google G */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: 'white',
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: '-apple-system, SF Pro Text, sans-serif',
              lineHeight: 1.25,
              whiteSpace: 'nowrap',
            }}
          >
            Avaliar no Google
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 12,
              fontFamily: '-apple-system, SF Pro Text, sans-serif',
              lineHeight: 1.25,
            }}
          >
            Toque para abrir
          </div>
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 11,
            fontFamily: '-apple-system, SF Pro Text, sans-serif',
            alignSelf: 'flex-start',
            paddingTop: 3,
            flexShrink: 0,
          }}
        >
          agora
        </div>
      </div>
    </div>
  );
};

// ─── Lock screen bottom icons ─────────────────────────────────────
const LockIcons: React.FC = () => (
  <>
    <div
      style={{
        position: 'absolute',
        bottom: 48,
        left: 56,
        width: 58,
        height: 58,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.13)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
        <path d="M9 2a1 1 0 0 0 0 2h1v1.07A7.001 7.001 0 0 0 5 12v1l-2 4h14l-2-4v-1a7.001 7.001 0 0 0-5-6.93V4h1a1 1 0 0 0 0-2H9z" />
        <path d="M10 20a2 2 0 0 0 4 0h-4z" />
      </svg>
    </div>
    <div
      style={{
        position: 'absolute',
        bottom: 48,
        right: 56,
        width: 58,
        height: 58,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.13)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    </div>
  </>
);

// ─── Touch Ripple ─────────────────────────────────────────────────
const TouchRipple: React.FC<{ x: number; y: number; progress: number }> = ({
  x,
  y,
  progress,
}) => {
  const r = interpolate(progress, [0, 1], [0, 55]);
  const opacity = interpolate(progress, [0, 0.4, 1], [0.8, 0.5, 0]);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        border: `2px solid rgba(255,255,255,${opacity})`,
        background: `rgba(255,255,255,${opacity * 0.15})`,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    />
  );
};

// ─── NFC Waves ───────────────────────────────────────────────────
const NFCWaves: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    >
      {[0, 1, 2].map((i) => {
        const delay = i * 0.3;
        const waveProgress = Math.max(0, progress - delay) / (1 - delay);
        const r = interpolate(waveProgress, [0, 1], [50, 130]);
        const opacity = interpolate(waveProgress, [0, 0.3, 1], [0, 0.7, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: -r,
              top: -r,
              width: r * 2,
              height: r * 2,
              borderRadius: '50%',
              border: `2.5px solid rgba(66,133,244,${opacity})`,
              boxShadow: `0 0 12px rgba(66,133,244,${opacity * 0.5})`,
            }}
          />
        );
      })}
    </div>
  );
};

// ─── Google Review Screen ─────────────────────────────────────────
interface ReviewProps {
  slideProgress: number;
  starsCount: number;
  textProgress: number;
  publishTapped: boolean;
}

const REVIEW_TEXT = 'Atendimento excelente e experiência incrível!';

const GoogleReviewScreen: React.FC<ReviewProps> = ({
  slideProgress,
  starsCount,
  textProgress,
  publishTapped,
}) => {
  const slideY = interpolate(slideProgress, [0, 1], [950, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const displayText = REVIEW_TEXT.slice(0, Math.floor(textProgress * REVIEW_TEXT.length));
  const btnScale = publishTapped ? 0.96 : 1;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: `translateY(${slideY}px)`,
        background: '#f5f5f5',
        zIndex: 6,
        overflowY: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'white',
          padding: '62px 20px 18px',
          borderBottom: '1px solid #e8e8e8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'white', fontSize: 20, fontWeight: 700, fontFamily: '-apple-system, sans-serif' }}>S</span>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', fontFamily: '-apple-system, sans-serif' }}>
              Sua Empresa
            </div>
            <div style={{ fontSize: 12.5, color: '#888', fontFamily: '-apple-system, sans-serif', marginTop: 1 }}>
              Rua das Flores, 123 · Centro
            </div>
          </div>
        </div>
      </div>

      {/* Rating card */}
      <div style={{ background: 'white', margin: 10, borderRadius: 14, padding: '22px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
        {/* Stars */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 22 }}>
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = n <= starsCount;
            const scale = filled && n === starsCount ? 1.15 : 1;
            return (
              <div key={n} style={{ transform: `scale(${scale})`, transition: 'transform 0.1s' }}>
                <svg width="42" height="42" viewBox="0 0 24 24">
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill={filled ? '#FBBC05' : 'none'}
                    stroke={filled ? '#FBBC05' : '#d0d0d0'}
                    strokeWidth={filled ? 0 : 1.5}
                  />
                </svg>
              </div>
            );
          })}
        </div>

        {/* Text area */}
        <div
          style={{
            border: '1.5px solid',
            borderColor: textProgress > 0 ? '#4285F4' : '#e0e0e0',
            borderRadius: 10,
            padding: '14px 16px',
            minHeight: 110,
            background: 'white',
            marginBottom: 16,
          }}
        >
          {textProgress > 0 ? (
            <span style={{ fontSize: 15, color: '#1a1a1a', fontFamily: '-apple-system, sans-serif', lineHeight: 1.55 }}>
              {displayText}
              {textProgress < 1 && (
                <span style={{ display: 'inline-block', width: 2, height: 17, background: '#4285F4', marginLeft: 1, verticalAlign: 'middle' }} />
              )}
            </span>
          ) : (
            <span style={{ fontSize: 15, color: '#b0b0b0', fontFamily: '-apple-system, sans-serif', lineHeight: 1.55 }}>
              Compartilhe detalhes da sua experiência neste local
            </span>
          )}
        </div>

        {/* Add photos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span style={{ fontSize: 14, color: '#4285F4', fontFamily: '-apple-system, sans-serif', fontWeight: 500 }}>
            Adicionar fotos
          </span>
        </div>

        {/* Publish button */}
        <div
          style={{
            background: '#4285F4',
            borderRadius: 10,
            padding: '16px',
            textAlign: 'center',
            transform: `scale(${btnScale})`,
            boxShadow: publishTapped
              ? '0 2px 6px rgba(66,133,244,0.3)'
              : '0 4px 16px rgba(66,133,244,0.4)',
          }}
        >
          <span style={{ color: 'white', fontSize: 16.5, fontWeight: 600, fontFamily: '-apple-system, sans-serif' }}>
            Publicar
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Success Overlay ──────────────────────────────────────────────
const SuccessOverlay: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const bgOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const checkScale = spring({ fps, frame, config: { damping: 14, stiffness: 90 }, from: 0, to: 1 });
  const textOpacity = interpolate(frame, [18, 34], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textY = interpolate(frame, [18, 34], [16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `rgba(3,10,26,${bgOpacity * 0.88})`,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
      }}
    >
      {/* Check circle */}
      <div
        style={{
          transform: `scale(${checkScale})`,
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2db559 0%, #34A853 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(52,168,83,0.5)',
        }}
      >
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      {/* Text */}
      <div
        style={{
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          textAlign: 'center',
          paddingLeft: 32,
          paddingRight: 32,
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 26,
            fontWeight: 700,
            fontFamily: '-apple-system, SF Pro Display, sans-serif',
            marginBottom: 10,
            letterSpacing: -0.3,
          }}
        >
          Avaliação enviada!
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 16,
            fontFamily: '-apple-system, SF Pro Text, sans-serif',
            lineHeight: 1.5,
          }}
        >
          Obrigado por compartilhar{'\n'}sua experiência.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Tapfy NFC Card (scene 2–3) ───────────────────────────────────
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
  const sx = cx + r * Math.cos(toRad(startDeg));
  const sy = cy + r * Math.sin(toRad(startDeg));
  const ex = cx + r * Math.cos(toRad(endDeg));
  const ey = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

const RING_SEGS = [
  { color: C.gBlue, start: -90, end: 0 },
  { color: C.gRed, start: 0, end: 90 },
  { color: C.gYellow, start: 90, end: 180 },
  { color: C.gGreen, start: 180, end: 270 },
];

const TapfyCardVisual: React.FC<{
  width: number;
  tiltX: number;
  tiltY: number;
  opacity: number;
}> = ({ width, tiltX, tiltY, opacity }) => {
  const h = width * 1.58;
  const ringR = width * 0.31;
  const cx = width * 0.5;
  const cy = h * 0.35;
  const svgW = width * 0.62;
  const svgH = svgW;

  return (
    <div
      style={{
        width,
        height: h,
        borderRadius: width * 0.09,
        background: 'linear-gradient(160deg, #1c1c1c 0%, #0d0d0d 60%, #111 100%)',
        boxShadow: `0 28px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.07)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${h * 0.09}px ${width * 0.1}px ${h * 0.08}px`,
        transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
        opacity,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Card sheen */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '35%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
          borderRadius: `${width * 0.09}px ${width * 0.09}px 0 0`,
        }}
      />

      {/* Ring + text */}
      <div style={{ position: 'relative', width: svgW, height: svgH }}>
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ overflow: 'visible' }}>
          {RING_SEGS.map(({ color, start, end }) => (
            <path
              key={color}
              d={arcPath(svgW / 2, svgH / 2, ringR, start, end)}
              fill="none"
              stroke={color}
              strokeWidth={svgW * 0.048}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <span
            style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: svgW * 0.155,
              fontFamily: '-apple-system, SF Pro Text, sans-serif',
              fontWeight: 400,
            }}
          >
            Avalie no
          </span>
          <div style={{ display: 'flex', fontSize: svgW * 0.26, fontWeight: 700, fontFamily: '-apple-system, SF Pro Display, sans-serif' }}>
            <span style={{ color: C.gBlue }}>G</span>
            <span style={{ color: C.gRed }}>o</span>
            <span style={{ color: C.gYellow }}>o</span>
            <span style={{ color: C.gBlue }}>g</span>
            <span style={{ color: C.gGreen }}>l</span>
            <span style={{ color: C.gRed }}>e</span>
          </div>
        </div>
      </div>

      {/* NFC icon */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: h * 0.025 }}>
        <svg width={width * 0.42} height={width * 0.28} viewBox="0 0 120 80" style={{ overflow: 'visible' }}>
          <g transform="translate(34,40)">
            {[0, 1, 2].map((i) => {
              const r = 14 + i * 11;
              return (
                <path
                  key={i}
                  d={arcPath(0, 0, r, -45, 45)}
                  fill="none"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
          <rect x="60" y="20" width="22" height="36" rx="4" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" />
          <rect x="65" y="24" width="12" height="4" rx="2" fill="rgba(255,255,255,0.85)" />
          <path d="M82 30 L95 38 L90 50 L78 46" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span
          style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: width * 0.08,
            fontFamily: '-apple-system, SF Pro Text, sans-serif',
            fontWeight: 600,
            letterSpacing: width * 0.018,
          }}
        >
          APROXIME SEU CELULAR
        </span>
      </div>

      {/* tapfy. logo */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <span
          style={{
            color: 'white',
            fontSize: width * 0.165,
            fontFamily: 'Georgia, serif',
            fontWeight: 400,
            letterSpacing: 0.5,
          }}
        >
          tapfy
        </span>
        <span style={{ color: C.gBlue, fontSize: width * 0.19, fontWeight: 700, fontFamily: 'Georgia, serif' }}>.</span>
      </div>
    </div>
  );
};

// ─── iPhone Body ──────────────────────────────────────────────────
interface IPhoneProps {
  tiltX: number;
  tiltY: number;
  floatY: number;
  scale: number;
  children: React.ReactNode;
}

const iPhone_W = 460;
const iPhone_H = 940;

const IPhone: React.FC<IPhoneProps> = ({ tiltX, tiltY, floatY, scale, children }) => (
  <div style={{ perspective: 1600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div
      style={{
        width: iPhone_W,
        height: iPhone_H,
        transform: `scale(${scale}) translateY(${floatY}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
        transformStyle: 'preserve-3d',
        position: 'relative',
      }}
    >
      {/* Titanium frame */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 58,
          background: 'linear-gradient(145deg, #4a4a4a 0%, #2c2c2c 25%, #181818 55%, #323232 85%, #3e3e3e 100%)',
          boxShadow: `
            inset 0 0 0 1px rgba(255,255,255,0.12),
            0 0 0 1px rgba(100,100,100,0.4),
            0 35px 100px rgba(0,0,0,0.9),
            0 70px 180px rgba(0,10,60,0.55)
          `,
        }}
      />

      {/* Screen */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          right: 10,
          bottom: 10,
          borderRadius: 50,
          background: '#000',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>

      {/* Left buttons: mute + volume */}
      {[
        { top: iPhone_H * 0.15, h: 34 },
        { top: iPhone_H * 0.23, h: 62 },
        { top: iPhone_H * 0.31, h: 62 },
      ].map(({ top, h }, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: -7,
            top,
            width: 5,
            height: h,
            background: 'linear-gradient(90deg, #2a2a2a, #3a3a3a)',
            borderRadius: '3px 0 0 3px',
            boxShadow: '-1px 0 3px rgba(0,0,0,0.5)',
          }}
        />
      ))}

      {/* Right button: power */}
      <div
        style={{
          position: 'absolute',
          right: -7,
          top: iPhone_H * 0.28,
          width: 5,
          height: 85,
          background: 'linear-gradient(270deg, #2a2a2a, #3a3a3a)',
          borderRadius: '0 3px 3px 0',
          boxShadow: '1px 0 3px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  </div>
);

// ─── Main Composition ─────────────────────────────────────────────
export const TapfyShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene 1 – iPhone entrance
  const iphoneScale = spring({
    fps,
    frame,
    from: 0.75,
    to: 1,
    config: { damping: 18, stiffness: 55 },
    delay: 8,
  });
  const floatY = Math.sin((frame / fps) * Math.PI * 0.7) * 12;
  const iphoneOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Card positioning
  const cardProgress = interpolate(frame, [T.CARD_ENTER, T.CARD_LAND], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const cardY = interpolate(cardProgress, [0, 1], [-380, -285]);
  const cardOpacity = interpolate(frame, [T.CARD_ENTER, T.CARD_ENTER + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Card disappears after NFC
  const cardFadeOut = interpolate(frame, [T.NFC_START + 10, T.NFC_START + 28], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const showCard = frame >= T.CARD_ENTER && frame < T.NFC_START + 30;

  // iPhone tilt during card approach (shows depth)
  const iphoneTilt = interpolate(frame, [T.CARD_ENTER + 10, T.CARD_LAND], [0, 8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const iphoneUntilt = interpolate(frame, [T.NFC_START, T.NFC_START + 25], [iphoneTilt, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tiltX = frame < T.NFC_START ? iphoneTilt : iphoneUntilt;

  // NFC pulse
  const nfcProgress = interpolate(frame, [T.NFC_START, T.NFC_START + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const showNFC = frame >= T.NFC_START && frame < T.ISLAND_EXPAND;

  // Dynamic Island
  const islandProgress = spring({
    fps,
    frame: Math.max(0, frame - T.ISLAND_EXPAND),
    from: 0,
    to: 1,
    config: { damping: 22, stiffness: 120 },
  });
  const islandTextOpacity = interpolate(frame, [T.ISLAND_TEXT_IN, T.ISLAND_TEXT_IN + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const showIsland = frame >= T.ISLAND_EXPAND;
  const islandHideProgress = interpolate(frame, [T.TAP_RIPPLE + 20, T.TAP_RIPPLE + 40], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const effectiveIslandProgress = frame < T.TAP_RIPPLE + 20 ? islandProgress : islandProgress * islandHideProgress;

  // Tap ripple on island
  const tapRipple = interpolate(frame, [T.TAP_RIPPLE, T.TAP_RIPPLE + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const showTapRipple = frame >= T.TAP_RIPPLE && frame < T.TAP_RIPPLE + 32;
  const tapNotifProgress = interpolate(frame, [T.TAP_RIPPLE, T.TAP_RIPPLE + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Google Review
  const reviewSlide = interpolate(frame, [T.REVIEW_SLIDE, T.REVIEW_IN], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const showReview = frame >= T.REVIEW_SLIDE;

  // Stars
  const starsCount = frame < T.STARS_START ? 0 : Math.min(5, Math.floor((frame - T.STARS_START) / 15) + 1);

  // Text typing
  const textProgress = interpolate(frame, [T.TEXT_START, T.TEXT_END], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Publish
  const publishTapped = frame >= T.PUBLISH_TAP && frame <= T.PUBLISH_TAP + 18;

  // Success
  const showSuccess = frame >= T.SUCCESS_IN;

  return (
    <AbsoluteFill>
      <Background />
      <GroundGlow floatY={floatY} />

      {/* iPhone */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: iphoneOpacity,
        }}
      >
        <IPhone
          tiltX={tiltX}
          tiltY={2.5}
          floatY={floatY}
          scale={iphoneScale * 0.86}
        >
          <Wallpaper />
          <StatusBar />
          <LockIcons />

          {showIsland && (
            <DynamicIsland
              expandProgress={effectiveIslandProgress}
              textOpacity={islandTextOpacity}
              tapProgress={tapNotifProgress}
            />
          )}

          {showNFC && (
            <div style={{ position: 'absolute', top: '12%', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
              <NFCWaves progress={nfcProgress} />
            </div>
          )}

          {showTapRipple && (
            <TouchRipple x={230} y={55} progress={tapRipple} />
          )}

          {showReview && (
            <GoogleReviewScreen
              slideProgress={reviewSlide}
              starsCount={starsCount}
              textProgress={textProgress}
              publishTapped={publishTapped}
            />
          )}

          {showSuccess && (
            <Sequence from={T.SUCCESS_IN} layout="none">
              <SuccessOverlay frame={frame - T.SUCCESS_IN} fps={fps} />
            </Sequence>
          )}
        </IPhone>
      </AbsoluteFill>

      {/* Tapfy card (floating above iPhone) */}
      {showCard && (
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, calc(-50% + ${cardY}px))`,
              opacity: cardOpacity * cardFadeOut,
            }}
          >
            <TapfyCardVisual
              width={240}
              tiltX={interpolate(cardProgress, [0, 1], [-18, 0])}
              tiltY={interpolate(cardProgress, [0, 1], [6, 0])}
              opacity={1}
            />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
