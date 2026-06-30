import { createClient } from '@/lib/supabase/server';
import Nav from './_components/Nav';
import Footer from './_components/Footer';
import styles from './marketing.module.css';

// Always reflect the current auth state (never serve a cached signed-out shell).
export const dynamic = 'force-dynamic';

export default async function MarketingLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const initialUser = user ? { email: user.email } : null;

  return (
    <div className={styles.page}>
      <Nav initialUser={initialUser} />
      <main className={styles.main}>{children}</main>
      <Footer />
    </div>
  );
}
