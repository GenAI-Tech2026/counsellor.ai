import {Color, makeProject, Vector2} from '@revideo/core';

import brand from './scenes/brand';
import problem from './scenes/problem';
import chat from './scenes/chat';
import flow from './scenes/flow';
import cta from './scenes/cta';

import './global.css';

export default makeProject({
  name: 'counsa-product-video',
  scenes: [brand, problem, chat, flow, cta],
  settings: {
    shared: {
      background: new Color('#f8f9fa'),
      range: [0, Infinity],
      size: new Vector2(1280, 720),
    },
    preview: {
      fps: 30,
      resolutionScale: 1,
    },
    rendering: {
      exporter: {
        name: '@revideo/core/wasm',
        options: {
          format: 'mp4',
        },
      },
      fps: 30,
      resolutionScale: 1,
      colorSpace: 'srgb',
    },
  },
});
