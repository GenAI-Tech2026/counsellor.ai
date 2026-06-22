'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot } from 'lucide-react';
import styles from '../marketing.module.css';

const REPLY = 'At ~12,000 CRL under OBC-NCL, these CSE picks are within reach:';
const CHIPS = ['NIT Goa · CSE', 'NIT Raipur · IT', 'IIIT Kota · CSE'];

/**
 * Animated mini-demo of the product for the hero: the bot "thinks", types out a
 * reply character-by-character, then pops in a few college chips. Plays once.
 */
export default function ChatDemo() {
  const [phase, setPhase] = useState('thinking'); // thinking | typing | done
  const [typed, setTyped] = useState('');
  const [chips, setChips] = useState(0);
  const timers = useRef([]);

  useEffect(() => {
    const t = timers.current;
    const wait = (fn, ms) => t.push(setTimeout(fn, ms));

    wait(() => {
      setPhase('typing');
      let i = 0;
      const type = () => {
        i += 1;
        setTyped(REPLY.slice(0, i));
        if (i < REPLY.length) {
          wait(type, 20);
        } else {
          let c = 0;
          const chip = () => {
            c += 1;
            setChips(c);
            if (c < CHIPS.length) wait(chip, 280);
            else wait(() => setPhase('done'), 1);
          };
          wait(chip, 380);
        }
      };
      wait(type, 20);
    }, 850);

    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <div className={styles.previewCard}>
      <div className={styles.previewHead}>
        <span className={styles.previewDots}><i /><i /><i /></span>
        <span className={styles.previewTitle}>Admission Mantrana</span>
      </div>
      <div className={styles.previewBody}>
        <div className={styles.pUser}>JEE rank 12,000, OBC-NCL, male — CSE options?</div>
        <div className={styles.pBotRow}>
          <span className={styles.pBotAvatar}><Bot size={15} /></span>
          <div className={styles.pBot}>
            {phase === 'thinking' ? (
              <span className={styles.typingDots}><i /><i /><i /></span>
            ) : (
              <>
                {typed}
                {phase === 'typing' && <span className={styles.typingCaret} />}
                {chips > 0 && (
                  <span className={styles.pChips}>
                    {CHIPS.slice(0, chips).map((c) => (
                      <span key={c} className={styles.pChip}>{c}</span>
                    ))}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
