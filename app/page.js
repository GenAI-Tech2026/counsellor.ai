import Link from 'next/link';
import styles from './page.module.css';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={`${styles.heroCard} glass`}>
        <div className={styles.badge}>
          <Sparkles size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
          AI-POWERED COUNSELLING
        </div>
        <h1 className={styles.title}>
          Your Personal<br />Admission Mantrana
        </h1>
        <p className={styles.description}>
          Navigate the complex world of college admissions, courses, and entrance exams with our advanced AI Counsellor. Get instant, personalized guidance to shape your future.
        </p>
        <Link href="/chat" className={styles.ctaButton}>
          Start Chatting Now
          <ArrowRight size={20} />
        </Link>
      </div>
    </main>
  );
}
