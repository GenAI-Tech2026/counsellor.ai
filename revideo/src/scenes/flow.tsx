/** @jsxImportSource @revideo/2d/lib */
import {Circle, Layout, Line, Txt, makeScene2D} from '@revideo/2d';
import {all, createRef, delay, easeInOutCubic, waitFor} from '@revideo/core';
import {T} from '../theme';

// Scene 4 — From rank to shortlist (~3.3s)
export default makeScene2D('flow', function* (view) {
  view.fill(T.paper);

  const title = createRef<Txt>();
  const progress = createRef<Line>();
  const dot = createRef<Circle>();

  const xs = [-360, 0, 360];
  const labels = ['Rank', 'Match', 'Shortlist'];
  const discs = [createRef<Circle>(), createRef<Circle>(), createRef<Circle>()];
  const nums = [createRef<Txt>(), createRef<Txt>(), createRef<Txt>()];

  view.add(
    <>
      <Txt ref={title} text={'From rank to shortlist.'} y={-180} opacity={0}
        fontFamily={T.serif} fontSize={50} fontWeight={600} fill={T.ink} />

      {/* track + animated progress */}
      <Line points={[[-360, 30], [360, 30]]} stroke={T.line} lineWidth={7} lineCap={'round'} />
      <Line ref={progress} points={[[-360, 30], [360, 30]]} stroke={T.accent} lineWidth={7} lineCap={'round'} end={0} />

      {xs.map((x, i) => (
        <Layout x={x} y={30}>
          <Circle ref={discs[i]} size={80} fill={T.surface} stroke={T.line} lineWidth={2}>
            <Txt ref={nums[i]} text={`${i + 1}`} fontFamily={T.sans} fontSize={26} fontWeight={800} fill={T.muted} />
          </Circle>
          <Txt text={labels[i]} y={78} fontFamily={T.sans} fontSize={20} fontWeight={700} fill={T.ink} />
        </Layout>
      ))}

      {/* travelling dot */}
      <Circle ref={dot} x={-360} y={30} size={18} fill={T.accent} opacity={0}
        shadowColor={T.accent} shadowBlur={16} />
    </>,
  );

  const activate = (i: number) =>
    all(
      discs[i]().fill(T.accent, 0.3),
      discs[i]().stroke(T.accent, 0.3),
      nums[i]().fill('#ffffff', 0.3),
    );

  yield* title().opacity(1, 0.5);
  yield* dot().opacity(1, 0.2);
  yield* all(
    progress().end(1, 2, easeInOutCubic),
    dot().x(360, 2, easeInOutCubic),
    activate(0),
    delay(0.9, activate(1)),
    delay(1.8, activate(2)),
  );
  yield* waitFor(0.6);
  yield* view.opacity(0, 0.4);
});
