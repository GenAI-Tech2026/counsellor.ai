import { Geist } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

// Use Geist for both body and display for a cohesive, modern premium look.
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Official profiles for the same entity. Populate with the real URLs and they
// flow into the Organization `sameAs` below — this is what lets Google/its AI
// consolidate "Counsa.ai" to THIS site instead of describing it from a social
// post. Leave an entry out until you have the exact URL (a wrong sameAs hurts).
const SOCIAL_LINKS = [
  // "https://www.instagram.com/<handle>",
  // "https://www.linkedin.com/company/<handle>",
  // "https://x.com/<handle>",
];

export const metadata = {
<<<<<<< Updated upstream
  metadataBase: new URL(SITE_URL),
  title: "counsa.ai — AI Admission Counsellor",
  description:
    "Counsa instantly analyzes your rank, category, and state to recommend the perfect colleges—combining 15 years of expert counselling with an IITian's judgment.",
  applicationName: "Counsa.ai",
  keywords: [
    "college predictor", "JEE cutoff", "EAMCET counselling", "engineering admissions",
    "rank to college", "AI counsellor", "seat allotment", "cutoff ranks",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Counsa.ai",
    title: "Counsa.ai — AI Admission Counsellor",
    description:
      "A chat-based AI counsellor that instantly finds eligible engineering colleges based on your rank, category, and gender.",
    images: [{ url: "/branding/android-chrome-512x512.png", width: 512, height: 512, alt: "Counsa.ai" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Counsa.ai — AI Admission Counsellor",
    description:
      "A chat-based AI counsellor that instantly finds eligible engineering colleges based on your rank, category, and gender.",
    images: ["/branding/android-chrome-512x512.png"],
=======
  title: "Counsa AI - Your Personal AI Admission Counsellor",
  description:
    "Counsa instantly analyzes your rank, category, and state to recommend the perfect colleges—combining 15 years of expert counselling with an IITian's judgment. Get expert guidance for engineering and medical admissions.",
  keywords: ["counsa", "counsa ai", "counsellor ai", "AI admission counsellor", "college predictor", "JEE rank predictor", "NEET college predictor", "EAMCET predictor", "engineering admissions", "medical admissions"],
  authors: [{ name: "Counsa AI" }],
  creator: "Counsa AI",
  publisher: "Counsa AI",
  metadataBase: new URL('https://www.counsa.ai'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Counsa AI - Your Personal AI Admission Counsellor",
    description: "Instantly analyzes your rank, category, and state to recommend the perfect colleges.",
    url: 'https://www.counsa.ai',
    siteName: 'Counsa AI',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Counsa AI - AI Admission Counsellor",
    description: "Instantly analyzes your rank, category, and state to recommend the perfect colleges.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
>>>>>>> Stashed changes
  },
  icons: {
    icon: [
      { url: '/branding/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/branding/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/branding/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/branding/favicon.ico' },
    ],
    apple: [
      { url: '/branding/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/branding/manifest.webmanifest',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f9fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0d12' },
  ],
};

// Structured data (schema.org JSON-LD). Gives search engines and AI answer
// engines an explicit, machine-readable description of the entity so they
// summarize Counsa.ai from THIS site rather than reconstructing it from social
// posts. Three linked nodes: the Organization (the brand), the WebSite, and the
// product itself as a free WebApplication in the education category.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Counsa.ai",
      url: SITE_URL,
      logo: `${SITE_URL}/branding/android-chrome-512x512.png`,
      description:
        "Counsa.ai is an AI-powered admission counsellor that turns a student's exam rank, category, and state into an instant, personalised list of eligible engineering colleges — replacing hours of reading cutoff PDFs.",
      ...(SOCIAL_LINKS.length ? { sameAs: SOCIAL_LINKS } : {}),
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Counsa.ai",
      description:
        "AI admission counsellor: type your JEE / EAMCET / entrance-exam rank and instantly see the engineering colleges you're eligible for.",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#webapp`,
      name: "Counsa.ai",
      url: SITE_URL,
      applicationCategory: "EducationApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript. Runs in any modern browser.",
      description:
        "A chat-based AI counsellor that instantly finds eligible colleges from your rank, category, and gender using official cutoff data — for JEE, TS/AP EAMCET, KCET, MHT-CET and more.",
      publisher: { "@id": `${SITE_URL}/#organization` },
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <head>
        <script
          type="application/ld+json"
          // JSON.stringify output is safe to inline; no user input is included.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
