import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// Google ring segments: [color, startAngle, endAngle] in degrees
const RING_SEGMENTS = [
  {color: '#4285F4', start: -90, end: 0},    // blue: top → right
  {color: '#EA4335', start: 0, end: 90},      // red: right → bottom
  {color: '#FBBC05', start: 90, end: 180},    // yellow: bottom → left
  {color: '#34A853', start: 180, end: 270},   // green: left → top
];

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return {x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad)};
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polarToCartesian(cx, cy, r, start);
  const e = polarToCartesian(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

function GoogleRing({progress}: {progress: number}) {
  const cx = 110;
  const cy = 110;
  const r = 88;
  const stroke = 7;
  const circumference = (Math.PI * 2 * r) / 4; // each segment is 90°

  return (
    <svg width={220} height={220} style={{overflow: 'visible'}}>
      {RING_SEGMENTS.map(({color, start, end}, i) => {
        const segProgress = interpolate(progress, [i * 0.25, (i + 1) * 0.25], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const dashLen = circumference * segProgress;
        const path = arcPath(cx, cy, r, start, end);
        return (
          <path
            key={color}
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dashLen} ${circumference}`}
          />
        );
      })}
    </svg>
  );
}

function NfcWaves({frame, fps}: {frame: number; fps: number}) {
  const waves = [0, 8, 16];
  return (
    <svg width={120} height={80} viewBox="0 0 120 80" style={{overflow: 'visible'}}>
      {/* Phone hand icon simplified */}
      <g transform="translate(60,40)">
        {/* Contactless symbol waves */}
        {waves.map((offset, i) => {
          const pulse = interpolate(
            (frame + offset) % 36,
            [0, 18, 36],
            [0.3, 1, 0.3],
            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
          );
          const r = 14 + i * 10;
          const angle = 40;
          const startA = -angle;
          const endA = angle;
          const path = arcPath(0, 0, r, startA, endA);
          return (
            <path
              key={i}
              d={path}
              fill="none"
              stroke="white"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={pulse}
            />
          );
        })}
        {/* Phone rectangle */}
        <rect
          x={14}
          y={-22}
          width={18}
          height={30}
          rx={3}
          fill="none"
          stroke="white"
          strokeWidth={2.5}
        />
        <rect x={19} y={-19} width={8} height={3} rx={1} fill="white" />
      </g>
    </svg>
  );
}

export const TapfyCard: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();

  // Card entrance
  const cardScale = spring({fps, frame, from: 0.82, to: 1, config: {damping: 18, stiffness: 80}, delay: 8});
  const cardOpacity = interpolate(frame, [5, 25], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Floating motion
  const floatY = Math.sin((frame / fps) * Math.PI * 0.8) * 10;
  const floatRotate = Math.sin((frame / fps) * Math.PI * 0.5) * 1.5;

  // Ring draw-in progress
  const ringProgress = interpolate(frame, [25, 75], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Text reveals
  const textAvalieOpacity = interpolate(frame, [60, 80], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const textAvalieY = interpolate(frame, [60, 80], [14, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const textGoogleOpacity = interpolate(frame, [72, 92], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const textGoogleY = interpolate(frame, [72, 92], [14, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const nfcOpacity = interpolate(frame, [95, 115], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const nfcY = interpolate(frame, [95, 115], [14, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const labelOpacity = interpolate(frame, [110, 130], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const tapfyOpacity = interpolate(frame, [125, 148], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Ambient glow pulse
  const glowPulse = interpolate(Math.sin((frame / fps) * Math.PI * 1.2), [-1, 1], [0.18, 0.32]);

  const CARD_W = 420;
  const CARD_H = 590;

  return (
    <AbsoluteFill style={{background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      {/* Background radial glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 55% 55% at 50% 50%, rgba(66,133,244,${glowPulse}) 0%, transparent 70%)`,
        }}
      />

      {/* Card */}
      <div
        style={{
          width: CARD_W,
          height: CARD_H,
          borderRadius: 42,
          background: 'linear-gradient(160deg, #1e1e1e 0%, #111 60%, #0a0a0a 100%)',
          boxShadow: `0 40px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '52px 32px 48px',
          transform: `scale(${cardScale}) translateY(${floatY}px) rotate(${floatRotate}deg)`,
          opacity: cardOpacity,
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
            height: '40%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
            borderRadius: '42px 42px 0 0',
            pointerEvents: 'none',
          }}
        />

        {/* Google ring + text block */}
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative'}}>
          {/* Ring */}
          <div style={{position: 'relative', width: 220, height: 220}}>
            <GoogleRing progress={ringProgress} />
            {/* Center text */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  color: 'white',
                  fontSize: 22,
                  fontFamily: 'Google Sans, Segoe UI, Arial, sans-serif',
                  fontWeight: 400,
                  letterSpacing: 0.3,
                  opacity: textAvalieOpacity,
                  transform: `translateY(${textAvalieY}px)`,
                }}
              >
                Avalie no
              </div>
              {/* Google colored text */}
              <div
                style={{
                  fontSize: 38,
                  fontFamily: 'Google Sans, Segoe UI, Arial, sans-serif',
                  fontWeight: 700,
                  opacity: textGoogleOpacity,
                  transform: `translateY(${textGoogleY}px)`,
                  display: 'flex',
                }}
              >
                <span style={{color: '#4285F4'}}>G</span>
                <span style={{color: '#EA4335'}}>o</span>
                <span style={{color: '#FBBC05'}}>o</span>
                <span style={{color: '#4285F4'}}>g</span>
                <span style={{color: '#34A853'}}>l</span>
                <span style={{color: '#EA4335'}}>e</span>
              </div>
            </div>
          </div>
        </div>

        {/* NFC section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            opacity: nfcOpacity,
            transform: `translateY(${nfcY}px)`,
          }}
        >
          <NfcWaves frame={frame} fps={fps} />
          <div
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 13,
              fontFamily: 'Arial, sans-serif',
              fontWeight: 600,
              letterSpacing: 3,
              opacity: labelOpacity,
            }}
          >
            APROXIME SEU CELULAR
          </div>
        </div>

        {/* tapfy logo */}
        <div
          style={{
            color: 'white',
            fontSize: 30,
            fontFamily: 'Georgia, serif',
            fontWeight: 400,
            letterSpacing: 1,
            opacity: tapfyOpacity,
          }}
        >
          tapfy<span style={{color: '#4285F4', fontWeight: 700}}>.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
