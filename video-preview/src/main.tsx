import React from 'react';
import {createRoot} from 'react-dom/client';
import {Player} from '@remotion/player';
import {TapfyCard} from './TapfyCard';

const root = createRoot(document.getElementById('root')!);

root.render(
  <Player
    component={TapfyCard}
    durationInFrames={180}
    compositionWidth={1080}
    compositionHeight={1920}
    fps={30}
    style={{width: 360, height: 640}}
    controls
    loop
    autoPlay
    inputProps={{}}
  />
);
