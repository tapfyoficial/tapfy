import React from 'react';
import {
	AbsoluteFill,
	interpolate,
	Sequence,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {linearTiming, springTiming, TransitionSeries} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {wipe} from '@remotion/transitions/wipe';

// ─── Shared design tokens ────────────────────────────────────────────────────
const BLACK = '#0a0a0a';
const WHITE = '#ffffff';
const GOLD = '#c9a84c';
const GOLD_LIGHT = '#f0d080';
const GRAY = '#888888';

// ─── Scene 1: Brand intro (0–90 frames / 3 s) ────────────────────────────────
const BrandIntro: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const logoScale = spring({fps, frame, config: {damping: 120, stiffness: 200}});
	const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const taglineY = interpolate(frame, [20, 50], [40, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const taglineOpacity = interpolate(frame, [20, 50], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const lineWidth = interpolate(frame, [30, 70], [0, 340], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill style={{background: BLACK, alignItems: 'center', justifyContent: 'center'}}>
			{/* Radial glow behind logo */}
			<div
				style={{
					position: 'absolute',
					width: 600,
					height: 600,
					borderRadius: '50%',
					background: `radial-gradient(circle, ${GOLD}22 0%, transparent 70%)`,
					opacity: logoOpacity,
				}}
			/>

			{/* Logo wordmark */}
			<div
				style={{
					transform: `scale(${logoScale})`,
					opacity: logoOpacity,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 24,
				}}
			>
				<div
					style={{
						fontFamily: 'Georgia, serif',
						fontSize: 120,
						fontWeight: 700,
						color: WHITE,
						letterSpacing: 16,
						textTransform: 'uppercase',
					}}
				>
					tapfy
				</div>

				{/* Gold divider line */}
				<div
					style={{
						height: 2,
						width: lineWidth,
						background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`,
					}}
				/>

				{/* Tagline */}
				<div
					style={{
						fontFamily: 'Arial, sans-serif',
						fontSize: 28,
						color: GOLD,
						letterSpacing: 8,
						textTransform: 'uppercase',
						transform: `translateY(${taglineY}px)`,
						opacity: taglineOpacity,
					}}
				>
					Your Identity. One Tap.
				</div>
			</div>
		</AbsoluteFill>
	);
};

// ─── Scene 2: Card showcase (0–90 frames / 3 s) ──────────────────────────────
const CardShowcase: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const cardY = spring({fps, frame, config: {damping: 80, stiffness: 100}});
	const cardScale = interpolate(cardY, [0, 1], [0.6, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const cardOpacity = interpolate(frame, [0, 25], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	// Subtle floating animation
	const floatY = interpolate(frame, [0, 45, 90], [0, -18, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const rotateZ = interpolate(frame, [0, 90], [-2, 2], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const textOpacity = interpolate(frame, [35, 65], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const textX = interpolate(frame, [35, 65], [60, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				background: `linear-gradient(135deg, #0a0a0a 0%, #1a1208 60%, #0a0a0a 100%)`,
				alignItems: 'center',
				justifyContent: 'center',
				flexDirection: 'row',
				gap: 100,
			}}
		>
			{/* Card visual */}
			<div
				style={{
					width: 440,
					height: 276,
					borderRadius: 20,
					background: `linear-gradient(135deg, #1a1208 0%, #2d2010 40%, #1a1208 100%)`,
					border: `2px solid ${GOLD}88`,
					boxShadow: `0 0 60px ${GOLD}44, 0 30px 80px rgba(0,0,0,0.8)`,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 12,
					opacity: cardOpacity,
					transform: `scale(${cardScale}) translateY(${floatY}px) rotateZ(${rotateZ}deg)`,
				}}
			>
				{/* NFC chip indicator */}
				<div
					style={{
						width: 48,
						height: 36,
						borderRadius: 6,
						background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`,
						boxShadow: `0 2px 12px ${GOLD}88`,
					}}
				/>
				<div
					style={{
						fontFamily: 'Georgia, serif',
						fontSize: 36,
						color: WHITE,
						letterSpacing: 6,
						textTransform: 'uppercase',
					}}
				>
					tapfy
				</div>
				<div
					style={{
						fontFamily: 'monospace',
						fontSize: 14,
						color: GOLD,
						letterSpacing: 4,
					}}
				>
					NFC • SMART CARD
				</div>
				{/* Decorative corner lines */}
				{[
					{top: 16, left: 16},
					{top: 16, right: 16},
					{bottom: 16, left: 16},
					{bottom: 16, right: 16},
				].map((pos, i) => (
					<div
						key={i}
						style={{
							position: 'absolute',
							...pos,
							width: 24,
							height: 24,
							borderTop: i < 2 ? `2px solid ${GOLD}` : 'none',
							borderBottom: i >= 2 ? `2px solid ${GOLD}` : 'none',
							borderLeft: i % 2 === 0 ? `2px solid ${GOLD}` : 'none',
							borderRight: i % 2 === 1 ? `2px solid ${GOLD}` : 'none',
						}}
					/>
				))}
			</div>

			{/* Feature copy */}
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 28,
					opacity: textOpacity,
					transform: `translateX(${textX}px)`,
				}}
			>
				{['One tap to share', 'No app required', 'Works everywhere'].map((feat, i) => (
					<FeatureLine key={i} text={feat} delay={i * 10} />
				))}
			</div>
		</AbsoluteFill>
	);
};

const FeatureLine: React.FC<{text: string; delay: number}> = ({text, delay}) => {
	const frame = useCurrentFrame();
	const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	return (
		<div style={{display: 'flex', alignItems: 'center', gap: 20, opacity}}>
			<div
				style={{
					width: 8,
					height: 8,
					borderRadius: '50%',
					background: GOLD,
					boxShadow: `0 0 12px ${GOLD}`,
				}}
			/>
			<span
				style={{
					fontFamily: 'Arial, sans-serif',
					fontSize: 32,
					color: WHITE,
					letterSpacing: 2,
				}}
			>
				{text}
			</span>
		</div>
	);
};

// ─── Scene 3: Stats / social proof (0–90 frames / 3 s) ───────────────────────
const Stats: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const bgOpacity = interpolate(frame, [0, 20], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				background: `linear-gradient(180deg, #0a0a0a 0%, #0f0d08 100%)`,
				alignItems: 'center',
				justifyContent: 'center',
				flexDirection: 'column',
				gap: 64,
				opacity: bgOpacity,
			}}
		>
			<div
				style={{
					fontFamily: 'Arial, sans-serif',
					fontSize: 22,
					color: GOLD,
					letterSpacing: 8,
					textTransform: 'uppercase',
				}}
			>
				Trusted by professionals
			</div>

			<div style={{display: 'flex', gap: 100}}>
				{[
					{value: '10K+', label: 'Cards Activated'},
					{value: '98%', label: 'Satisfaction'},
					{value: '0s', label: 'Setup Time'},
				].map((stat, i) => (
					<StatCard key={i} value={stat.value} label={stat.label} delay={i * 15} fps={fps} />
				))}
			</div>
		</AbsoluteFill>
	);
};

const StatCard: React.FC<{value: string; label: string; delay: number; fps: number}> = ({
	value,
	label,
	delay,
	fps,
}) => {
	const frame = useCurrentFrame();
	const s = spring({fps, frame: Math.max(0, frame - delay), config: {damping: 100, stiffness: 150}});
	const translateY = interpolate(s, [0, 1], [40, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 12,
				opacity: s,
				transform: `translateY(${translateY}px)`,
			}}
		>
			<div
				style={{
					fontFamily: 'Georgia, serif',
					fontSize: 80,
					fontWeight: 700,
					color: GOLD,
					lineHeight: 1,
				}}
			>
				{value}
			</div>
			<div
				style={{
					fontFamily: 'Arial, sans-serif',
					fontSize: 20,
					color: GRAY,
					letterSpacing: 4,
					textTransform: 'uppercase',
				}}
			>
				{label}
			</div>
		</div>
	);
};

// ─── Root composition ─────────────────────────────────────────────────────────
// Total: 90 + 90 + 90 = 270 frames (9 s at 30 fps)
// TransitionSeries handles the overlapping transitions (15-frame fade/wipe).
export const TapfyIntro: React.FC = () => {
	return (
		<TransitionSeries>
			<TransitionSeries.Sequence durationInFrames={100}>
				<BrandIntro />
			</TransitionSeries.Sequence>

			<TransitionSeries.Transition
				timing={springTiming({config: {damping: 200}, durationInFrames: 20})}
				presentation={fade()}
			/>

			<TransitionSeries.Sequence durationInFrames={100}>
				<CardShowcase />
			</TransitionSeries.Sequence>

			<TransitionSeries.Transition
				timing={linearTiming({durationInFrames: 20})}
				presentation={wipe({direction: 'from-left'})}
			/>

			<TransitionSeries.Sequence durationInFrames={90}>
				<Stats />
			</TransitionSeries.Sequence>
		</TransitionSeries>
	);
};
