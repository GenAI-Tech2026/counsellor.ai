/** @jsxImportSource @revideo/2d/lib */
import {Circle, Img, Layout, Line, Rect, Txt, makeScene2D} from '@revideo/2d';
import {all, createRef, easeOutBack, easeOutCubic, sequence, waitFor} from '@revideo/core';
import {T} from '../theme';

// Scene 3 — Live chat answer (~4.7s)
export default makeScene2D('chat', function* (view) {
  view.fill(T.paper);

  const card = createRef<Rect>();
  const userBubble = createRef<Rect>();
  const reply = createRef<Txt>();
  const chips = createRef<Layout>();

  view.add(
    <Rect
      ref={card}
      width={680}
      height={400}
      radius={24}
      fill={T.surface}
      stroke={T.line}
      lineWidth={1.5}
      scale={0.92}
      shadowColor={'rgba(22,22,29,0.16)'}
      shadowBlur={50}
      shadowOffsetY={26}
      clip
    >
      {/* header bar */}
      <Rect width={680} height={62} y={-169} fill={T.surfaceAlt} />
      <Line points={[[-340, -138], [340, -138]]} stroke={T.line} lineWidth={1.5} />
      <Circle x={-306} y={-169} size={12} fill={'#e7b4ad'} />
      <Circle x={-286} y={-169} size={12} fill={'#e6d39a'} />
      <Circle x={-266} y={-169} size={12} fill={'#a9d8b8'} />
      <Img src={'/counsa_logo_mini.png'} width={20} height={20} x={-228} y={-169} />
      <Txt text={'counsa.ai'} x={-160} y={-169} fontFamily={T.sans} fontSize={20} fontWeight={600} fill={T.muted} />

      {/* user bubble */}
      <Rect
        ref={userBubble}
        x={150}
        y={-78}
        width={420}
        height={56}
        radius={[16, 16, 6, 16]}
        fill={T.accentSoft}
        stroke={T.accentSoftLine}
        lineWidth={1.5}
        scale={0}
      >
        <Txt text={'JEE rank 12,000, OBC-NCL — CSE options?'} fontFamily={T.sans} fontSize={20} fill={T.ink} />
      </Rect>

      {/* bot answer */}
      <Rect x={-300} y={30} size={42} radius={11} fill={T.surface} stroke={T.line} lineWidth={1.5}>
        <Img src={'/counsa_logo_mini.png'} width={24} height={24} />
      </Rect>
      <Txt
        ref={reply}
        text={''}
        x={-250}
        y={20}
        offset={[-1, 0]}
        width={460}
        textWrap
        fontFamily={T.sans}
        fontSize={21}
        fill={T.inkSoft}
        lineHeight={30}
      />

      {/* result chips */}
      <Layout ref={chips} direction={'row'} gap={10} x={-30} y={120}>
        {['NIT Goa · CSE', 'NIT Raipur · IT', 'IIIT Kota · CSE'].map((label) => (
          <Rect
            scale={0}
            radius={999}
            fill={T.surface}
            stroke={T.line}
            lineWidth={1.5}
            padding={[12, 18]}
            shadowColor={'rgba(22,22,29,0.06)'}
            shadowBlur={6}
            shadowOffsetY={2}
          >
            <Txt text={label} fontFamily={T.sans} fontSize={17} fontWeight={600} fill={T.ink} />
          </Rect>
        ))}
      </Layout>
    </Rect>,
  );

  yield* all(card().scale(1, 0.45, easeOutBack), userBubble().scale(1, 0.4, easeOutBack));
  yield* waitFor(0.45);
  yield* reply().text('At ~12,000 CRL, these CSE picks are in reach:', 1.1);
  yield* sequence(0.12, ...chips().children().map((c) => c.scale(1, 0.4, easeOutBack)));
  yield* waitFor(0.9);
  yield* view.opacity(0, 0.4);
});
