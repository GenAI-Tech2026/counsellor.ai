/** @jsxImportSource @revideo/2d/lib */
import {Circle, Layout, Line, Rect, Txt, makeScene2D} from '@revideo/2d';
import {all, createRef, easeOutBack, easeOutCubic, waitFor} from '@revideo/core';
import {T} from '../theme';

// Scene 2 — The problem: same rank, diverging outcomes (~4s)
export default makeScene2D('problem', function* (view) {
  view.fill(T.paper);

  const heading = createRef<Layout>();
  const rankNode = createRef<Circle>();
  const goodPath = createRef<Line>();
  const badPath = createRef<Line>();
  const goodCard = createRef<Rect>();
  const badCards = createRef<Layout>();

  view.add(
    <>
      <Layout ref={heading} direction={'row'} gap={16} y={-230} opacity={0}>
        <Txt text={'Same rank.'} fontFamily={T.serif} fontSize={56} fontWeight={600} fill={T.ink} />
        <Txt text={'Different fates.'} fontFamily={T.serif} fontSize={56} fontWeight={600} fill={T.accent} />
      </Layout>

      {/* diverging paths */}
      <Line
        ref={goodPath}
        points={[[-360, 40], [-120, -40], [150, -70]]}
        stroke={T.accent}
        lineWidth={7}
        lineCap={'round'}
        end={0}
      />
      <Line
        ref={badPath}
        points={[[-360, 40], [-160, 110], [-40, 90], [80, 150], [220, 130]]}
        stroke={'#c9c4bb'}
        lineWidth={6}
        lineCap={'round'}
        lineJoin={'round'}
        end={0}
      />

      {/* rank node */}
      <Circle ref={rankNode} x={-360} y={40} size={68} fill={T.accent}>
        <Txt text={'rank'} fontFamily={T.sans} fontSize={20} fontWeight={700} fill={'#ffffff'} />
      </Circle>

      {/* success card (top branch) */}
      <Rect
        ref={goodCard}
        x={300}
        y={-70}
        width={230}
        height={92}
        radius={16}
        fill={T.surface}
        stroke={T.line}
        lineWidth={1.5}
        scale={0}
        shadowColor={'rgba(22,22,29,0.12)'}
        shadowBlur={28}
        shadowOffsetY={10}
        layout
        alignItems={'center'}
        gap={16}
        padding={18}
      >
        <Circle size={42} fill={T.emerald}>
          <Txt text={'✓'} fontFamily={T.sans} fontSize={26} fontWeight={700} fill={'#ffffff'} />
        </Circle>
        <Layout direction={'column'} gap={8}>
          <Rect width={96} height={9} radius={5} fill={T.ink} opacity={0.82} />
          <Rect width={66} height={7} radius={4} fill={T.muted} opacity={0.5} />
        </Layout>
      </Rect>

      {/* messy sheets (bottom branch) */}
      <Layout ref={badCards} x={250} y={140} scale={0}>
        <Rect x={10} y={8} width={120} height={92} radius={10} fill={'#efece6'} stroke={T.line} lineWidth={1.5} rotation={-6} />
        <Rect width={120} height={92} radius={10} fill={'#f4f1ec'} stroke={T.line} lineWidth={1.5}>
          <Layout direction={'column'} gap={10} y={6}>
            <Rect width={70} height={7} radius={4} fill={T.muted} opacity={0.4} />
            <Rect width={84} height={6} radius={3} fill={T.line} />
            <Rect width={58} height={6} radius={3} fill={T.line} />
          </Layout>
        </Rect>
        <Circle x={62} y={-44} size={28} fill={'#d9d4ca'}>
          <Txt text={'?'} fontFamily={T.sans} fontSize={20} fontWeight={800} fill={'#ffffff'} />
        </Circle>
      </Layout>
    </>,
  );

  yield* heading().opacity(1, 0.5);
  yield* all(goodPath().end(1, 1.1, easeOutCubic), badPath().end(1, 1.3, easeOutCubic));
  yield* all(goodCard().scale(1, 0.5, easeOutBack), badCards().scale(1, 0.5, easeOutBack));
  yield* waitFor(0.9);
  yield* view.opacity(0, 0.4);
});
