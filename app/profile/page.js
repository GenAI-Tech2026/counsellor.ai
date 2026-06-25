'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, UserCog } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import styles from './profile.module.css';

const EMPTY = { exam: '', rank: '', category: '', gender: '' };

// Exam / category options — kept in sync with the chat's quick-details form.
const EXAMS = [
  { value: 'TGEAPCET', label: 'TGEAPCET' },
  { value: 'APEAMCET', label: 'AP EAPCET' },
  { value: 'JEE', label: 'JEE Main' },
  { value: 'JEE Advanced', label: 'JEE Advanced' },
  { value: 'KCET', label: 'KCET' },
  { value: 'MHTCET', label: 'MHT-CET' },
];
const CATEGORIES = {
  TGEAPCET: ['OC', 'BC-A', 'BC-B', 'BC-C', 'BC-D', 'BC-E', 'SC-I', 'SC-II', 'SC-III', 'ST', 'EWS'],
  APEAMCET: ['OC', 'BC-A', 'BC-B', 'BC-C', 'BC-D', 'BC-E', 'SC', 'ST', 'EWS'],
  JEE: ['OPEN', 'OBC-NCL', 'SC', 'ST', 'EWS'],
  'JEE Advanced': ['OPEN', 'OBC-NCL', 'SC', 'ST', 'EWS'],
  KCET: ['GM', '1', '2A', '2B', '3A', '3B', 'SC', 'ST'],
  MHTCET: ['General', 'OBC', 'SC', 'ST', 'EWS', 'VJ', 'NT1', 'NT2', 'NT3', 'SEBC'],
};
const genderNeeded = (exam) => Boolean(exam) && exam !== 'KCET' && exam !== 'MHTCET';

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState(undefined); // undefined = still checking
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // ── Auth + load the existing profile ──
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      const u = data.user ?? null;
      setUser(u);
      if (!u) { setLoading(false); return; }
      try {
        const res = await fetch('/api/profile');
        const { profile } = await res.json();
        if (active && profile) {
          // Back-compat: older saves used male/female.
          const g = profile.gender === 'female' ? 'girls'
            : profile.gender === 'male' ? 'boys'
            : (profile.gender ?? '');
          setForm({
            exam: profile.exam ?? '',
            rank: profile.rank ?? '',
            category: profile.category ?? '',
            gender: g,
          });
        }
      } catch {
        // Start from a blank form on failure.
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => { active = false; };
  }, [supabase]);

  const update = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'exam') {
        if (next.category && !(CATEGORIES[value] || []).includes(next.category)) next.category = '';
        if (!genderNeeded(value)) next.gender = '';
      }
      return next;
    });
    setSaved(false);
  };

  const setGender = (g) => {
    setForm((f) => ({ ...f, gender: f.gender === g ? '' : g }));
    setSaved(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('save failed');
      setSaved(true);
    } catch {
      setError('Could not save your details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = CATEGORIES[form.exam] || [];
  const showGender = genderNeeded(form.exam);

  return (
    <main className={styles.main}>
      {/* Always-visible back control (#nav) — prominent, top-left, easy to hit. */}
      <Link href="/chat" className={styles.backBtn}>
        <ArrowLeft size={17} />
        <span>Back to chat</span>
      </Link>

      <div className={styles.card}>
        <div className={styles.heading}>
          <span className={styles.headIcon}><UserCog size={20} /></span>
          <div>
            <h1 className={styles.title}>Your details</h1>
            <p className={styles.subtitle}>
              Saved details are added to your chats automatically, so you don&apos;t
              have to repeat them.
            </p>
          </div>
        </div>

        {user === undefined || loading ? (
          <div className={styles.loading}>
            <Loader2 size={18} className={styles.spinner} />
            <span>Loading…</span>
          </div>
        ) : user === null ? (
          <div className={styles.prompt}>
            <p>Sign in to save your details.</p>
            <Link href="/login" className={styles.signIn}>Sign in</Link>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>Exam</span>
              <select className={styles.input} value={form.exam} onChange={update('exam')}>
                <option value="">Not set</option>
                {EXAMS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Rank</span>
              <input
                type="number"
                min="1"
                className={styles.input}
                value={form.rank}
                onChange={update('rank')}
                placeholder="e.g. 5000"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Category</span>
              <select
                className={styles.input}
                value={form.category}
                onChange={update('category')}
                disabled={!form.exam}
              >
                <option value="">{form.exam ? 'Not set' : 'Pick an exam first'}</option>
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            {showGender && (
              <div className={styles.field}>
                <span className={styles.label}>Gender</span>
                <div className={styles.genderToggle} role="group" aria-label="Gender">
                  <button
                    type="button"
                    className={`${styles.genderOpt} ${form.gender === 'boys' ? styles.genderActive : ''}`}
                    onClick={() => setGender('boys')}
                  >Boys</button>
                  <button
                    type="button"
                    className={`${styles.genderOpt} ${form.gender === 'girls' ? styles.genderActive : ''}`}
                    onClick={() => setGender('girls')}
                  >Girls</button>
                </div>
              </div>
            )}

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.save} disabled={saving}>
              {saving ? (
                <><Loader2 size={16} className={styles.spinner} /> Saving…</>
              ) : saved ? (
                <><Check size={16} /> Saved</>
              ) : (
                'Save details'
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
