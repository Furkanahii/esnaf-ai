"use client";
import Link from "next/link";
import Navbar from "./components/Navbar";
import { useEffect, useState } from "react";

const FEATURES = [
  { icon: "📸", title: "Vision Agent", desc: "Defter/fiş fotoğrafından otomatik veri çıkarma. Gemini Vision ile doğrudan analiz.", color: "from-blue-500 to-cyan-500" },
  { icon: "📊", title: "Finansal Analist", desc: "Nakit akışı, borç-alacak analizi ve proaktif uyarılar. Krizden önce haberdar ol.", color: "from-amber-500 to-orange-500" },
  { icon: "🛒", title: "E-Ticaret Uzmanı", desc: "5 platformda komisyon karşılaştırması, SEO uyumlu ilan hazırlama. Hybrid RAG ile sıfır halüsinasyon.", color: "from-purple-500 to-pink-500" },
  { icon: "📦", title: "Stok Takibi", desc: "Envanter yönetimi, düşük stok uyarıları ve otomatik sipariş önerileri.", color: "from-emerald-500 to-teal-500" },
];

const STATS = [
  { value: 5, suffix: "", label: "Uzman Agent", icon: "🧠" },
  { value: 5, suffix: "+", label: "E-Ticaret Platformu", icon: "🛒" },
  { value: 0, suffix: "", label: "Halüsinasyon (Hybrid RAG)", icon: "🛡️" },
  { value: 100, suffix: "%", label: "Türkçe Desteği", icon: "🇹🇷" },
];

const TECH = [
  { name: "LangGraph", desc: "Multi-Agent Orkestrasyon" },
  { name: "Gemini 2.0", desc: "Vision + Text AI" },
  { name: "FastAPI", desc: "SSE Streaming" },
  { name: "Next.js 16", desc: "React Server Components" },
  { name: "Hybrid RAG", desc: "Sıfır Halüsinasyon" },
];

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const step = Math.max(1, Math.floor(target / 40));
    const timer = setInterval(() => {
      setCount(prev => {
        if (prev + step >= target) { clearInterval(timer); return target; }
        return prev + step;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count}{suffix}</>;
}

export default function LandingPage() {
  return (
    <main className="gradient-bg min-h-screen text-white overflow-x-hidden">
      <Navbar />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-16 text-center">
        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl" style={{ animation: "float 6s ease-in-out infinite" }} />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" style={{ animation: "float 8s ease-in-out infinite 2s" }} />

        <div className="relative z-10 max-w-4xl mx-auto" style={{ animation: "slideUp 0.8s ease" }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-emerald-400 font-medium mb-6">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            BTK & Google Hackathon 2026
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 leading-tight">
            <span className="gradient-text">Esnaf.AI</span>
            <br />
            <span className="text-3xl sm:text-4xl font-semibold text-[#aebac1]">Otonom Esnaf Asistanı</span>
          </h1>

          <p className="text-lg sm:text-xl text-[#8696a0] max-w-2xl mx-auto mb-10 leading-relaxed">
            Türkiye&apos;nin geleneksel esnafını dijital ekonomiye entegre eden,
            <span className="text-emerald-400 font-medium"> LangGraph tabanlı 5 uzman agent</span> ile
            çalışan otonom yapay zeka asistanı.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/chat"
              className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-lg shadow-xl shadow-emerald-900/30 hover:shadow-emerald-700/40 hover:scale-105 transition-all duration-300"
            >
              <span className="relative z-10 flex items-center gap-2">
                💬 Hemen Konuş
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </span>
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 rounded-2xl glass text-[#e9edef] font-semibold text-lg hover:bg-white/10 transition-all duration-300 hover:scale-105"
            >
              📊 Dashboard
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#8696a0] text-xs" style={{ animation: "float 3s ease-in-out infinite" }}>
          <span>Keşfet</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4" style={{ animation: "slideUp 0.6s ease" }}>
          <span className="gradient-text">5 Uzman Agent</span>, Tek Orkestratör
        </h2>
        <p className="text-center text-[#8696a0] mb-14 max-w-xl mx-auto">
          LangGraph Supervisor her mesajı analiz eder, doğru uzman agent&apos;a yönlendirir.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 group cursor-default"
              style={{ animation: `slideUp 0.5s ease ${i * 0.1}s both` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} mb-4 text-2xl shadow-lg`}>
                {f.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">{f.title}</h3>
              <p className="text-[#8696a0] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 py-20">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <div key={s.label} className="glass rounded-2xl p-6 text-center" style={{ animation: `slideUp 0.5s ease ${i * 0.15}s both` }}>
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-3xl sm:text-4xl font-black gradient-text mb-1">
                <AnimatedCounter target={s.value} suffix={s.suffix} />
              </div>
              <div className="text-xs text-[#8696a0] font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="px-4 py-20 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-10">
          <span className="gradient-text">Tech Stack</span>
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          {TECH.map((t, i) => (
            <div key={t.name} className="glass rounded-xl px-5 py-3 flex flex-col items-center hover:scale-105 transition-transform" style={{ animation: `fadeIn 0.4s ease ${i * 0.1}s both` }}>
              <span className="font-bold text-emerald-400 text-sm">{t.name}</span>
              <span className="text-[10px] text-[#8696a0]">{t.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section className="px-4 py-20 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-8"><span className="gradient-text">Mimari</span></h2>
        <div className="glass rounded-2xl p-8 text-left font-mono text-sm text-[#8696a0] leading-relaxed overflow-x-auto">
          <pre>{`
┌─────────────────────────────────────────────────────┐
│                    KULLANICI                        │
│     WhatsApp Clone UI + Sesli Komut + Fotoğraf      │
└───────────────────────┬─────────────────────────────┘
                        │ SSE Stream
                        ▼
┌─────────────────────────────────────────────────────┐
│              🧠 SUPERVISOR AGENT                    │
│         (LangGraph Orkestratör — Akıllı Yönlendirme)│
└──┬──────────┬──────────┬──────────┬─────────────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
┌──────┐ ┌────────┐ ┌────────┐ ┌────────┐
│📸    │ │📊      │ │🛒      │ │📦      │
│Vision│ │Finansal│ │E-Ticaret│ │Envanter│
│Agent │ │Analist │ │ Uzmanı │ │Takibi  │
└──┬───┘ └────┬───┘ └────┬───┘ └────┬───┘
   │          │          │          │
   └──────────┴──────────┴──────────┘
                    │
            ┌───────▼───────┐
            │  HYBRID RAG   │
            │ Komisyon │ KDV │
            │ Kargo │ SGK   │
            └───────────────┘`}
          </pre>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto glass rounded-3xl p-10 alert-pulse">
          <h2 className="text-3xl font-bold mb-4">Hazır mısın abi? 🤝</h2>
          <p className="text-[#8696a0] mb-8">Esnaf.AI&apos;a bir mesaj at, gerisini o halleder.</p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-lg shadow-xl hover:scale-105 transition-all"
          >
            💬 Konuşmaya Başla
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-[#8696a0] border-t border-white/5">
        BTK & Google Hackathon 2026 — Esnaf.AI
      </footer>
    </main>
  );
}
