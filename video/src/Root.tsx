import React from 'react';
import {Composition} from 'remotion';
import {TapfyIntro} from './TapfyIntro';

export const Root: React.FC = () => {
	return (
		<>
			<Composition
				id="TapfyIntro"
				component={TapfyIntro}
				durationInFrames={270}
				width={1920}
				height={1080}
				fps={30}
				defaultProps={{}}
			/>
		</>
	);
};
