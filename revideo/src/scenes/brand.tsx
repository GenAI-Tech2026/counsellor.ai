/** @jsxImportSource @revideo/2d/lib */
import {Img, Layout, Txt, makeScene2D} from '@revideo/2d';
import {all, createRef, easeOutBack, easeOutCubic, waitFor} from '@revideo/core';
import {T} from '../theme';

// Scene 1 — Brand reveal (~2.7s)
export default makeScene2D('brand', function* (view) {
  view.fill(T.paper);

  const group = createRef<Layout>();
  const logo = createRef<Img>();
  const title = createRef<Txt>();
  const tag = createRef<Txt>();

  view.add(
    <Layout ref={group} direction={'column'} alignItems={'center'} gap={24}>
      <Img ref={logo} src={'/counsa_logo_mini.png'} width={132} height={132} scale={0} />
      <Txt
        ref={title}
        text={'counsa.ai'}
        fontFamily={T.serif}
        fontSize={68}
        fontWeight={600}
        fill={T.ink}
        opacity={0}
        y={20}
      />
      <Txt
        ref={tag}
        text={'AI admission counselling'}
        fontFamily={T.sans}
        fontSize={26}
        fill={T.muted}
        opacity={0}
      />
    </Layout>,
  );

  yield* logo().scale(1, 0.6, easeOutBack);
  yield* all(title().opacity(1, 0.45), title().y(0, 0.45, easeOutCubic));
  yield* tag().opacity(1, 0.4);
  yield* waitFor(0.7);
  yield* group().opacity(0, 0.4);
});
