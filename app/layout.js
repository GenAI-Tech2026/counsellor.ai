import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

// DM Sans for body/UI; Fraunces as the high-contrast serif display face used
// for hero + section headlines (the warm, editorial Karumi-style look).
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "counsa.ai — AI Admission Counsellor",
  description:
    "Counsa instantly analyzes your rank, category, and state to recommend the perfect colleges—combining 15 years of expert counselling with an IITian's judgment.",
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
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
