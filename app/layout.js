import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";

// Body / UI: a warm, modern humanist sans — friendlier than Inter while staying
// crisp and professional, which suits a calm counselling product.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

// Refined editorial serif for display headings.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

export const metadata = {
  title: "counsa.ai — AI Admission Counsellor",
  description:
    "Calm, personalized guidance for TGEAPCET & JEE college admissions, powered by AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
