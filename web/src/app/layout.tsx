import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "AI Impact Summit Planner | India AI Impact Summit 2026",
  description:
    "463 sessions. 5 days. Tell us about yourself and get a personalized schedule for the India AI Impact Summit, February 16-20, 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jakarta.variable} ${jetbrains.variable} min-h-screen antialiased`}
        style={{ fontFamily: 'var(--font-display)', color: '#5C5C5A', backgroundColor: '#FFFFFF' }}
      >
        <NavBar />
        {children}
      </body>
    </html>
  );
}
