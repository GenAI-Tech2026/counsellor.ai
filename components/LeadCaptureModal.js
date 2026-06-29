"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from '../app/chat/chat.module.css';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export default function LeadCaptureModal({ user, onComplete, forceOpen, onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', phone: '', state: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    let t;
    if (forceOpen) {
      t = setTimeout(() => setIsOpen(true), 0);
      return () => clearTimeout(t);
    }
    // If the user is logged in but hasn't completed the form, we want the modal open to collect phone & state.
    // If they are a guest (!user), we do NOT pop it up automatically so they can explore the tool.
    const existing = localStorage.getItem('counsa_lead_captured');
    const dismissed = sessionStorage.getItem('counsa_lead_dismissed');
    
    if (!existing && !dismissed) {
      if (user) {
        t = setTimeout(() => {
          setFormData(prev => ({ 
            ...prev, 
            email: user?.email || '' // Pre-fill email if logged in
          }));
          setIsOpen(true);
        }, 0);
      }
    } else {
      onComplete?.();
    }
    return () => clearTimeout(t);
  }, [user, onComplete, forceOpen]);

  const handleGoogleSignIn = async () => {
    setIsRedirecting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      alert("Sign in failed. Please try again.");
      setIsRedirecting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (formData.phone.length !== 10) {
      alert("Please enter exactly 10 digits for your phone number.");
      setIsSubmitting(false);
      return;
    }

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: fullName, 
          phone: `+91${formData.phone}`, 
          state: formData.state,
          email: formData.email
        }),
      });

      if (response.ok) {
        localStorage.setItem('counsa_lead_captured', 'true');
        setIsOpen(false);
        onComplete?.();
      } else {
        alert("Something went wrong. Please try again.");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        
        {!user ? (
          // --- STEP 1: Google Sign In ---
          <>
            <h2>Welcome to counsa.ai! 🎓</h2>
            <p>Please sign in to start your personalized counselling journey.</p>
            
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isRedirecting}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%',
                padding: '14px',
                background: '#fff',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '16px'
              }}
            >
              <span>
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
                </svg>
              </span>
              {isRedirecting ? 'Redirecting...' : 'Continue with Google'}
            </button>
            <button 
              type="button" 
              onClick={() => {
                sessionStorage.setItem('counsa_lead_dismissed', 'true');
                setIsOpen(false);
                onClose?.();
              }}
              style={{
                background: 'none', border: 'none', color: '#666', 
                textDecoration: 'underline', marginTop: '1rem', 
                cursor: 'pointer', fontSize: '0.9rem', width: '100%',
                display: 'block', textAlign: 'center'
              }}
            >
              Skip for now
            </button>
          </>
        ) : (
          // --- STEP 2: Profile Setup ---
          <>
            <h2 style={{ marginBottom: '8px' }}>Unlock Personalized Guidance 🚀</h2>
            <p style={{ color: '#555', marginBottom: '20px', lineHeight: '1.5' }}>
              We need a few details to safely save your chat history and provide college recommendations tailored specifically to you.
            </p>
            
            <form onSubmit={handleSubmit} className={styles.leadForm}>
              
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input 
                  type="email" 
                  required 
                  placeholder="e.g. john@gmail.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  readOnly={!!user?.email} // Lock it if we got it from Google
                  style={{ opacity: user?.email ? 0.7 : 1 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>First Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="First"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Last Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Last"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>Phone Number</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--line, #ddd)', borderRadius: '8px', background: 'var(--canvas, #fff)', overflow: 'hidden' }}>
                  <span style={{ padding: '12px 0 12px 12px', color: 'var(--ink-soft, #666)', fontWeight: 500 }}>+91</span>
                  <input 
                    type="tel" 
                    required 
                    placeholder="9876543210"
                    pattern="[0-9]{10}"
                    title="Please enter exactly 10 digits"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    style={{ border: 'none', borderRadius: 0, outline: 'none', flex: 1 }}
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>State</label>
                <select 
                  required
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  className={styles.detailSelect}
                  style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
                >
                  <option value="" disabled>Select your state...</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              <button type="submit" disabled={isSubmitting} className={styles.submitBtn} style={{ marginTop: '8px' }}>
                {isSubmitting ? 'Saving...' : 'Start Chatting'}
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px', color: '#666', fontSize: '0.85rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span><strong>100% Private.</strong> We never share your data or spam you.</span>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
