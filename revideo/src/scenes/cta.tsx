/** @jsxImportSource @revideo/2d/lib */
import {Circle, Gradient, Rect, Txt, makeScene2D} from '@revideo/2d';
import {all, createRef, easeOutBack, easeOutCubic, waitFor} from '@revideo/core';
import {T} from '../theme';

// Scene 5 — Call to action (~2.3s)
export default makeScene2D('cta', function* (view) {
  const title = createRef<Txt>();
  const button = createRef<Rect>();
  const wordmark = createRef<Txt>();

  view.add(
    <>
      <Rect width={1280} height={720} fill={'#16161d'} />
      {/* warm glow */}
      <Circle
        y={-360}
        size={1200}
        fill={new Gradient({
          type: 'radial',
          from: [0, 0],
          to: [0, 0],
          fromRadius: 0,
          toRadius: 600,
          stops: [
            {offset: 0, color: 'rgba(243,91,4,0.55)'},
            {offset: 1, color: 'rgba(243,91,4,0)'},
          ],
        })}
      />

      <Txt
        ref={title}
        text={'Find your college with confidence.'}
        width={760}
        textWrap
        textAlign={'center'}
        y={-40}
        opacity={0}
        fontFamily={T.serif}
        fontSize={58}
        fontWeight={600}
        fill={'#ffffff'}
        lineHeight={64}
      />

      <Rect ref={button} y={110} radius={14} fill={'#ffffff'} padding={[18, 34]} scale={0}
        shadowColor={'rgba(0,0,0,0.35)'} shadowBlur={40} shadowOffsetY={18}>
        <Txt text={'Start chatting  →'} fontFamily={T.sans} fontSize={24} fontWeight={700} fill={T.accentDeep} />
      </Rect>

      <Txt ref={wordmark} text={'counsa.ai'} y={200} opacity={0}
        fontFamily={T.sans} fontSize={20} fill={'rgba(255,255,255,0.7)'} />
    </>,
  );

  yield* all(title().opacity(1, 0.5), title().y(-50, 0.5, easeOutCubic));
  yield* button().scale(1, 0.45, easeOutBack);
  yield* wordmark().opacity(1, 0.4);
  yield* waitFor(1.0);
});
