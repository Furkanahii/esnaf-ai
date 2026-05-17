import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Esnaf.AI | Türkiye'nin İlk Otonom Esnaf Asistanı",
  description: "LangGraph + Gemini ile çalışan, defter okuyan, mali analiz yapan, e-ticaret ilan hazırlayan otonom yapay zeka asistanı. BTK Hackathon 2026.",
  keywords: "esnaf, yapay zeka, AI, hackathon, LangGraph, Gemini, e-ticaret, mali analiz",
  openGraph: {
    title: "Esnaf.AI — Otonom Esnaf Asistanı",
    description: "Geleneksel esnafı dijital ekonomiye entegre eden AI asistanı",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="flex flex-col min-h-screen">{children}</body>
    </html>
  );
}
