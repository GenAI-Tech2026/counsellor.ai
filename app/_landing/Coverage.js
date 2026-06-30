import s from './coverage.module.css';

const LOGOS = [
  { src: '/data/logos/jeemains.png', alt: 'JEE Main' },
  { src: '/data/logos/jeeadvanced.png', alt: 'JEE Advanced' },
  { src: '/data/logos/bitsat.png', alt: 'BITSAT' },
  { src: '/data/logos/apeamcet.png', alt: 'AP EAMCET' },
  { src: '/data/logos/tgeamcet.png', alt: 'TS EAMCET' },
  { src: '/data/logos/kcet.png', alt: 'KCET' },
  { src: '/data/logos/comedk.jpg', alt: 'COMEDK' },
  { src: '/data/logos/mhtcet.png', alt: 'MHT CET' },
  { src: '/data/logos/keam.png', alt: 'KEAM' },
  { src: '/data/logos/wbjee.png', alt: 'WBJEE' },
  { src: '/data/logos/tnea.png', alt: 'TNEA' },
  { src: '/data/logos/cuet.png', alt: 'CUET' },
];

export default function Coverage() {
  return (
    <section className={s.section} aria-label="Entrance exams we cover">
      <p className={s.eyebrow}>Covering India&apos;s Major Entrance Exams</p>

      <div className={s.marquee}>
        <div className={s.track}>
          {LOGOS.map((logo, i) => (
            <img
              key={`a-${i}`}
              className={s.logo}
              src={logo.src}
              alt={logo.alt}
              loading="lazy"
              draggable="false"
            />
          ))}
          {LOGOS.map((logo, i) => (
            <img
              key={`b-${i}`}
              className={s.logo}
              src={logo.src}
              alt=""
              aria-hidden="true"
              loading="lazy"
              draggable="false"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
