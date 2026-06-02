import {Composition} from 'remotion';
import {TapfyCard} from './TapfyCard';
import {TapfyShowcase} from './TapfyShowcase';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="TapfyCard"
        component={TapfyCard}
        durationInFrames={180}
        width={1080}
        height={1920}
        fps={30}
        defaultProps={{}}
      />
      <Composition
        id="TapfyShowcase"
        component={TapfyShowcase}
        durationInFrames={570}
        width={1080}
        height={1920}
        fps={30}
        defaultProps={{}}
      />
    </>
  );
};
