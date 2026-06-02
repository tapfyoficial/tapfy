import {Composition} from 'remotion';
import {TapfyCard} from './TapfyCard';

export const Root: React.FC = () => {
  return (
    <Composition
      id="TapfyCard"
      component={TapfyCard}
      durationInFrames={180}
      width={1080}
      height={1920}
      fps={30}
      defaultProps={{}}
    />
  );
};
