'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ArrowRight, GraduationCap, Sparkles, MessageSquare, Database, Search, CheckCircle2 } from 'lucide-react';

function Typewriter({ text, delay = 0, speed = 30 }) {
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
    let timeout;
    let i = 0;
    const typeWriter = () => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        timeout = setTimeout(typeWriter, speed);
      }
    };
    timeout = setTimeout(typeWriter, delay);
    return () => clearTimeout(timeout);
  }, [text, delay, speed]);
  return <>{displayedText}</>;
}
import styles from './page.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  return (
    <div className={styles.landingContainer}>
      {/* Header */}
      <motion.header 
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.logo}>
          <img src="/branding/counsa_logo_mini.png" alt="Counsa.ai Logo" style={{height: '28px', width: 'auto', borderRadius: '4px'}} />
          Counsa.ai
        </div>
        <nav className={styles.nav}>
          <Link href="#">Exams</Link>
          <Link href="#">Colleges</Link>
          <Link href="#">Cutoffs</Link>
        </nav>
        <div>
          <Link href="/chat">
            <button className={styles.headerBtn}>Start Chatting</button>
          </Link>
        </div>
      </motion.header>

      {/* Hero */}
      <section className={styles.hero}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp} className={styles.tagline}>India's First AI Exam Counsellor</motion.div>
          <motion.h1 variants={fadeUp} className={styles.title}>Don&apos;t stress about college admissions ever again</motion.h1>
          <motion.p variants={fadeUp} className={styles.subtitle}>
            A chat-based AI counsellor that instantly finds eligible engineering colleges based on your rank, category, and gender.
          </motion.p>
          <motion.div variants={fadeUp} className={styles.ctaForm}>
            <input type="text" placeholder="Enter your rank (JEE, EAMCET, etc.)..." className={styles.emailInput} />
            <Link href="/chat" style={{textDecoration: 'none'}}>
              <button className={styles.primaryBtn} style={{height: '100%'}}>Find Colleges</button>
            </Link>
          </motion.div>
          <motion.div variants={fadeUp} className={styles.noCreditCard}>100% free • No signup required</motion.div>
        </motion.div>

        <motion.div 
          className={styles.heroGraphic}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className={styles.heroUiMockup} style={{flexDirection: 'column', padding: '0', textAlign: 'left'}}>
            {/* Chat Header */}
            <div style={{borderBottom: '1px solid #eee', padding: '1rem', background: '#fafafa', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600'}}>
              <div style={{background: '#ff7e5f', padding: '6px', borderRadius: '6px', color: 'white'}}>
                <GraduationCap size={16} />
              </div>
              Counsellor AI
            </div>
            {/* Chat Body */}
            <div style={{padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, background: '#fff'}}>
              {/* User message */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
                style={{alignSelf: 'flex-end', background: '#f0f0f0', padding: '0.8rem 1rem', borderRadius: '12px 12px 0 12px', fontSize: '0.9rem', maxWidth: '80%', minHeight: '44px'}}
              >
                <Typewriter text="I got 15,200 rank in TGEAPCET, category BC-B, male. Can I get CSE in Hyderabad?" delay={1200} speed={30} />
              </motion.div>
              {/* AI Message */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 4.0 }}
                style={{alignSelf: 'flex-start', background: '#fff5eb', padding: '0.8rem 1rem', borderRadius: '12px 12px 12px 0', fontSize: '0.9rem', maxWidth: '80%', border: '1px solid #ffe4cc', minHeight: '60px'}}
              >
                <div style={{fontWeight: 'bold', marginBottom: '0.5rem', color: '#ff7e5f', display: 'flex', alignItems: 'center', gap: '4px'}}>
                  <Sparkles size={14} /> AI Analysis
                </div>
                <Typewriter text="Based on the 2024 cutoff data, here are the top colleges for CSE where you are eligible:" delay={4200} speed={25} />
                <motion.ul 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 6.5, duration: 0.5 }}
                  style={{marginTop: '0.5rem', paddingLeft: '1.2rem', lineHeight: '1.6'}}
                >
                  <li>CBIT, Gandipet (Last rank: 16,050)</li>
                  <li>VNR VJIET, Bachupally (Last rank: 17,200)</li>
                  <li>Vasavi College, Ibrahimbagh (Last rank: 18,100)</li>
                </motion.ul>
              </motion.div>
            </div>
          </div>

        </motion.div>
      </section>

      {/* Logos */}
      <motion.section 
        className={styles.logos}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.8 }}
        viewport={{ once: true }}
      >
        <div className={styles.logoItem} style={{fontSize: '1.5rem'}}>JEE Main</div>
        <div className={styles.logoItem} style={{fontSize: '1.5rem'}}>JEE Advanced</div>
        <div className={styles.logoItem} style={{fontSize: '1.5rem'}}>TGEAPCET</div>
        <div className={styles.logoItem} style={{fontSize: '1.5rem'}}>APEAMCET</div>
        <div className={styles.logoItem} style={{fontSize: '1.5rem'}}>KCET</div>
        <div className={styles.logoItem} style={{fontSize: '1.5rem'}}>MHTCET</div>
      </motion.section>

      <motion.section 
        className={styles.fullScreenStatement}
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true, margin: "0px" }}
      >
        <p className={styles.statementLabel}>Powered by verified data</p>
        <h2 className={styles.statementTitle}>Say goodbye to giant cutoff PDFs</h2>
      </motion.section>

      {/* Features */}
      <section className={styles.section}>
        <div className={styles.featureSplit}>
          <motion.div 
            className={styles.featureText}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className={styles.featureLabel}>Natural Language Search</div>
            <h3 className={styles.featureHeading}>Just ask questions like you're talking to a human counsellor.</h3>
            <p className={styles.featureDesc}>No more filtering through thousands of rows in Excel. Tell the AI your rank and preferences, and get an instant curated list of colleges.</p>
          </motion.div>
          <motion.div 
            className={styles.featureVisual}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div style={{ width: '80%', background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid #ff7e5f', paddingBottom: '0.5rem', marginBottom: '1rem'}}>
                <Search size={20} color="#ff7e5f"/>
                <span style={{fontWeight: '500', color: '#555'}}>Search query...</span>
              </div>
              <div style={{fontSize: '1.2rem', fontWeight: 'bold', lineHeight: '1.4'}}>
                "Show me colleges with fee less than 1 Lakh offering ECE in Ranga Reddy district"
              </div>
            </div>
          </motion.div>
        </div>

        <div className={`${styles.featureSplit} ${styles.reverse}`}>
          <motion.div 
            className={styles.featureText}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className={styles.featureLabel}>Hyper-Personalized</div>
            <h3 className={styles.featureHeading}>Tailored recommendations based on your exact profile.</h3>
            <p className={styles.featureDesc}>We take into account your specific category, local area, gender, and minority status to ensure the predictions are 100% accurate for you.</p>
          </motion.div>
          <motion.div 
            className={styles.featureVisual}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Rank: 24,500', 'Category: SC', 'Gender: Female', 'Region: OU', 'Branch: CSE', 'Fee < 1L'].map((tag, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  style={{ background: 'white', padding: '0.8rem 1.2rem', borderRadius: '20px', boxShadow: '0 5px 15px rgba(0,0,0,0.05)', fontWeight: '600', color: '#444' }}
                >
                  {tag}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className={styles.featureSplit}>
          <motion.div 
            className={styles.featureText}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className={styles.featureLabel}>Always Up To Date</div>
            <h3 className={styles.featureHeading}>Built on official phase-wise counselling data.</h3>
            <p className={styles.featureDesc}>Our vector database is continuously updated with the latest First Phase, Second Phase, and Final Phase seat allotment records.</p>
          </motion.div>
          <motion.div 
            className={styles.featureVisual}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
          >
             <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
               style={{ background: 'white', padding: '2rem', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', textAlign: 'center' }}
             >
                <Database size={48} color="#ff7e5f" style={{marginBottom: '1rem'}}/>
                <div style={{fontSize: '2rem', fontWeight: 'bold'}}>2,820+</div>
                <div style={{color: '#666', marginTop: '0.5rem'}}>College & Branch Combinations</div>
             </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Security/Trust */}
      <section className={styles.section} style={{paddingTop: '2rem'}}>
        <motion.div 
          className={styles.sectionCenter}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className={styles.sectionTitle}>Why students trust Counsa.ai</h2>
        </motion.div>

        <motion.div 
          className={styles.securityCards}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={fadeUp} className={styles.secCard}>
            <div className={styles.secIconWrap}>
              <CheckCircle2 size={48} />
            </div>
            <h4 className={styles.secTitle}>100% Authentic Data</h4>
            <p className={styles.secDesc}>All recommendations are grounded purely in officially released cutoff ranks.</p>
          </motion.div>
          <motion.div variants={fadeUp} className={styles.secCard}>
            <div className={styles.secIconWrap}>
               <Sparkles size={48} />
            </div>
            <h4 className={styles.secTitle}>Powered by Gemini</h4>
            <p className={styles.secDesc}>Uses state-of-the-art LLMs to understand complex queries and constraints.</p>
          </motion.div>
          <motion.div variants={fadeUp} className={styles.secCard}>
            <div className={styles.secIconWrap}>
               <MessageSquare size={48} />
            </div>
            <h4 className={styles.secTitle}>Instant Answers</h4>
            <p className={styles.secDesc}>No waiting for human counsellors. Get answers at 2 AM the night before choice filling.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* Testimonials */}
      <section className={styles.section}>
        <motion.div 
          className={styles.sectionCenter}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className={styles.sectionTitle}>Success Stories</h2>
        </motion.div>

        <motion.div 
          className={styles.testimonials}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={fadeUp} className={styles.testimonialCard} style={{backgroundImage: 'url(https://i.pravatar.cc/300?img=11)'}}>
             <div className={styles.testimonialContent}>
               <div style={{marginBottom: '1rem', fontStyle: 'italic'}}>"I thought I wouldn't get into a top 10 college with my rank, but the AI found a specific branch I was eligible for!"</div>
               <div className={styles.tName}>Rahul S.</div>
               <div className={styles.tRole}>TGEAPCET Rank: 18k</div>
             </div>
          </motion.div>
          <motion.div variants={fadeUp} className={styles.testimonialCard} style={{backgroundImage: 'url(https://i.pravatar.cc/300?img=12)'}}>
             <div className={styles.testimonialContent}>
               <div style={{marginBottom: '1rem', fontStyle: 'italic'}}>"Much better than paying ₹5000 to human counsellors. It gave me exactly the list I needed for choice filling."</div>
               <div className={styles.tName}>Priya M.</div>
               <div className={styles.tRole}>Secured CSE at VNR VJIET</div>
             </div>
          </motion.div>
          <motion.div variants={fadeUp} className={styles.testimonialCard} style={{backgroundImage: 'url(https://i.pravatar.cc/300?img=13)'}}>
             <div className={styles.testimonialContent}>
               <div style={{marginBottom: '1rem', fontStyle: 'italic'}}>"The way it handles category and local area reservations is flawless. Saved me hours of PDF scrolling."</div>
               <div className={styles.tName}>Karthik Reddy</div>
               <div className={styles.tRole}>APEAMCET Aspirant</div>
             </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Bottom CTA */}
      <motion.section 
        className={styles.bottomCta}
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
      >
         <h2 className={styles.bottomCtaTitle}>Secure your future with the<br/>right college choice.</h2>
         <div className={styles.ctaForm}>
          <Link href="/chat" style={{textDecoration: 'none'}}>
            <motion.button 
              className={styles.primaryBtn} 
              style={{fontSize: '1.2rem', padding: '1rem 2rem'}}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Chatting Now <ArrowRight size={20} style={{display: 'inline', verticalAlign: 'middle', marginLeft: '8px'}}/>
            </motion.button>
          </Link>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div>
          <div className={styles.logo} style={{marginBottom: '1rem'}}>
            <img src="/branding/counsa_logo_mini.png" alt="Counsa.ai Logo" style={{height: '28px', width: 'auto', borderRadius: '4px'}} />
            Counsa.ai
          </div>
          <p style={{color: '#666', fontSize: '0.9rem'}}>© 2026 Counsa.ai<br/>Built for engineering aspirants.</p>
        </div>
        <div className={styles.footerLinks}>
          <div className={styles.footerCol}>
            <span className={styles.footerTitle}>Exams</span>
            <Link href="#">JEE Main & Adv</Link>
            <Link href="#">TGEAPCET</Link>
            <Link href="#">APEAMCET</Link>
            <Link href="#">KCET</Link>
            <Link href="#">MHTCET</Link>
          </div>
          <div className={styles.footerCol}>
            <span className={styles.footerTitle}>Resources</span>
            <Link href="#">College Predictor</Link>
            <Link href="#">Cutoff PDFs</Link>
            <Link href="#">Counselling Guide</Link>
          </div>
          <div className={styles.footerCol}>
            <span className={styles.footerTitle}>Legal</span>
            <Link href="#">Privacy Policy</Link>
            <Link href="#">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
