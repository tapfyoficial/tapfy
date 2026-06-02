import React from 'react';
import {Composition} from 'remotion';
import {TapfyIntro} from './TapfyIntro';
import {TapfyNFCDemo} from './TapfyNFCDemo';

export const Root: React.FC = () => {
	return (
		<>
			{/* Original brand intro (9 s) */}
			<Composition
				id="TapfyIntro"
				component={TapfyIntro}
				durationInFrames={270}
				width={1920}
				height={1080}
				fps={30}
				defaultProps={{}}
			/>

			{/* NFC demo — full product walkthrough (18 s) */}
			<Composition
				id="TapfyNFCDemo"
				component={TapfyNFCDemo}
				durationInFrames={540}
				width={1920}
				height={1080}
				fps={30}
				defaultProps={{}}
			/>
		</>
	);
};
