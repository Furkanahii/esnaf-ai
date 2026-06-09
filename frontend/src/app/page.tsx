"use client";
import Link from "next/link";
import Navbar from "./components/Navbar";
import { useEffect, useState } from "react";

const FEATURES = [
  { icon: "📸", title: "Fotoğrafla Veri Okuma", desc: "Veresiye defterinin, fişin veya faturanın fotoğrafını çek — yapay zeka anında borç-alacak tablosunu çıkarsın.", color: "from-blue-500 to-cyan-500" },
  { icon: "📊", title: "Mali Durum Analizi", desc: "Kasandaki nakit, borçların, alacakların ve riskli müşterilerin tam röntgenini çek. Krizden önce haberdar ol.", color: "from-amber-500 to-orange-500" },
  { icon: "🛒", title: "E-Ticaret İlan Hazırlama", desc: "5 farklı platformda en düşük komisyonlu satış kanalını bul, SEO uyumlu ilan taslağını saniyede hazırla.", color: "from-purple-500 to-pink-500" },
  { icon: "📦", title: "Akıllı Stok Takibi", desc: "Hangi ürün bitiyor, hangisi azalıyor? Otomatik sipariş önerileri ile rafın boş kalmasın.", color: "from-emerald-500 to-teal-500" },
  { icon: "📡", title: "Mahalle Radarı", desc: "Bölgendeki fiyat trendlerini ve rakiplerin durumunu takip et. Talebi artan ürünleri kaçırma.", color: "from-rose-500 to-red-500" },
  { icon: "🎙️", title: "Sesli Komut Desteği", desc: "Ellerini kullanamıyor musun? Mikrofona konuş, Esnaf.AI seni anlasın ve hemen işine baksın.", color: "from-indigo-500 to-violet-500" },
];

const STATS = [
  { value: 5, suffix: "", label: "Uzman Asistan", icon: "🧠" },
  { value: 5, suffix: "+", label: "E-Ticaret Platformu", icon: "🛒" },
  { value: 20, suffix: "+", label: "Ürün Takibi", icon: "📦" },
  { value: 100, suffix: "%", label: "Türkçe Destek", icon: "🇹🇷" },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Mesajını Yaz veya Fotoğraf Çek", desc: "Veresiye defterini fotoğrafla, mali durumunu sor veya ürün sat demeni yeterli.", icon: "✍️" },
  { step: "2", title: "Yapay Zeka Analiz Etsin", desc: "Esnaf.AI mesajını anlayıp doğru uzmana yönlendiriyor. Arka planda vergi, komisyon ve stok verilerini çekiyor.", icon: "🤖" },
  { step: "3", title: "Sonucunu Al, Kararını Ver", desc: "Borç-alacak tablosu, e-ticaret ilanı veya stok raporu hazır. Onaylarsan yayına alınsın!", icon: "✅" },
];

const TESTIMONIALS = [
  { name: "Bakkal Mehmet", location: "Kadıköy", text: "Veresiye defterimi fotoğrafladım, 2 saniyede borç-alacak tablosu çıktı. Artık defter karıştırmıyorum!", avatar: "🧔" },
  { name: "Tuhafiyeci Ayşe", location: "Beşiktaş", text: "Trendyol'a ilan açmayı bilmiyordum. Esnaf.AI başlık bile yazdı, tek tuşla yayına aldım.", avatar: "👩" },
  { name: "Manav Hüseyin", location: "Üsküdar", text: "Stokta hangi ürün bitiyor diye her gün sayardım. Şimdi sistem bana uyarı gönderiyor.", avatar: "👨‍🌾" },
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
            Yapay Zeka Destekli İş Ortağın
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 leading-tight">
            <span className="gradient-text">Esnaf.AI</span>
            <br />
            <span className="text-3xl sm:text-4xl font-semibold text-[#aebac1]">Dijital İş Ortağın</span>
          </h1>

          <p className="text-lg sm:text-xl text-[#8696a0] max-w-2xl mx-auto mb-10 leading-relaxed">
            Defterini fotoğrafla, mali durumunu sor, ürünlerini internete koy.
            <span className="text-emerald-400 font-medium"> Yapay zeka senin için çalışsın.</span>
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

      {/* How It Works */}
      <section className="px-4 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4" style={{ animation: "slideUp 0.6s ease" }}>
          <span className="gradient-text">Nasıl Çalışır?</span>
        </h2>
        <p className="text-center text-[#8696a0] mb-14 max-w-xl mx-auto">
          3 adımda işinin kontrolünü ele al
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((item, i) => (
            <div key={i} className="relative glass rounded-2xl p-8 text-center hover:scale-[1.03] transition-all duration-300" style={{ animation: `slideUp 0.5s ease ${i * 0.15}s both` }}>
              <div className="text-5xl mb-4">{item.icon}</div>
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white text-sm font-bold mb-3">{item.step}</div>
              <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
              <p className="text-[#8696a0] text-sm leading-relaxed">{item.desc}</p>
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 text-emerald-500 text-2xl z-10">→</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          <span className="gradient-text">Neler Yapabilir?</span>
        </h2>
        <p className="text-center text-[#8696a0] mb-14 max-w-xl mx-auto">
          Her biri kendi alanında uzman 5 yapay zeka asistanı, senin için çalışıyor.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 group cursor-default"
              style={{ animation: `slideUp 0.5s ease ${i * 0.1}s both` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} mb-4 text-2xl shadow-lg`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">{f.title}</h3>
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

      {/* Testimonials */}
      <section className="px-4 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          <span className="gradient-text">Esnaflarımız Ne Diyor?</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="glass rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300" style={{ animation: `slideUp 0.5s ease ${i * 0.1}s both` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-2xl shadow-lg">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{t.name}</div>
                  <div className="text-[10px] text-[#8696a0]">📍 {t.location}</div>
                </div>
              </div>
              <p className="text-sm text-[#aebac1] leading-relaxed italic">&ldquo;{t.text}&rdquo;</p>
              <div className="mt-3 flex gap-0.5">
                {[1,2,3,4,5].map(s => <span key={s} className="text-amber-400 text-xs">★</span>)}
              </div>
            </div>
          ))}
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
        <p>© 2026 Esnaf.AI — Türk Esnafının Dijital İş Ortağı</p>

      </footer>
    </main>
  );
}
