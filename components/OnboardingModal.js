"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import styles from './OnboardingModal.module.css';

export default function OnboardingModal({ user }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // If the user is not signed in, always show the popup when they visit the page.
    if (!user) {
      // Small delay to allow the page to render first before showing the modal
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleStart = () => {
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={styles.modal}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className={styles.brand}>
              <Image src="/branding/counsa_logo_mini.png" alt="counsa.ai" width={24} height={24} unoptimized />
              <span>counsa.ai</span>
            </div>

            <h2 className={styles.title}>
              Your Personal <span className={styles.titleHighlight}>AI Guide</span> for Engineering Admissions
            </h2>

            <p className={styles.desc}>
              Built with 15 years of expert counselling experience. Get instant, expert guidance on colleges, cutoffs, branches, and smart counselling choices without confusion or guesswork.
            </p>

            <button type="button" onClick={handleStart} className={styles.button}>
              <Sparkles size={18} />
              <span>Start Asking Questions</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
