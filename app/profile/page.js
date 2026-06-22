'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, UserCog } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import styles from './profile.module.css';

const EMPTY = { exam: '', rank: '', category: '', gender: '' };

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
          setForm({
            exam: profile.exam ?? '',
            rank: profile.rank ?? '',
            category: profile.category ?? '',
            gender: profile.gender ?? '',
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
    setForm((f) => ({ ...f, [key]: e.target.value }));
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

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <Link href="/chat" className={styles.back}>
          <ArrowLeft size={16} />
          <span>Back to chat</span>
        </Link>

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
                <option value="TGEAPCET">TGEAPCET</option>
                <option value="JEE">JEE</option>
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
              <select className={styles.input} value={form.category} onChange={update('category')}>
                <option value="">Not set</option>
                <option value="OC">OC</option>
                <option value="BC">BC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Gender</span>
              <select className={styles.input} value={form.gender} onChange={update('gender')}>
                <option value="">Not set</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>

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
