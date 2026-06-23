import Link from 'next/link';
import styles from './page.module.css';
import { Sparkles, ArrowRight, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from './components/SignOutButton';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className={styles.main}>
      <div className={styles.authArea}>
        {user ? (
          <>
            <span className={styles.authEmail}>
              {user.user_metadata?.name || user.email}
            </span>
            <SignOutButton className={styles.authButton} />
          </>
        ) : (
          <Link href="/login" className={styles.authButton}>
            <LogIn size={16} />
            Sign in
          </Link>
        )}
      </div>

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
