import { DM_Sans } from "next/font/google";
import "./globals.css";

// Use DM Sans for both body and display for a cohesive, modern premium look.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "counsa.ai — AI Admission Counsellor",
  description:
    "Calm, personalized guidance for TGEAPCET & JEE college admissions, powered by AI.",
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
