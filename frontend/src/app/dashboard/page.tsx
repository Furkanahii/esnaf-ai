"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Link from "next/link";

type DashboardData = {
  financial: {
    total_debt: number;
    total_receivable: number;
    cash: number;
    net: number;
    is_critical: boolean;
    items: { name: string; amount: number; type: string; date: string; instrument_type?: string; risk_score?: number }[];
    assets?: { name: string; value: number; monthly_depreciation: number }[];
    esnaf_score?: number;
  };
  inventory: {
    total_products: number;
    total_stock_value: number;
    total_retail_value: number;
    potential_profit: number;
    out_of_stock: string[];
    low_stock: string[];
  };
  store_name: string;
};

type RadarData = {
  location: string;
  trends: { category: string; product_name: string; demand_increase_percent: number; competitor_avg_price: number; insight: string }[];
};

type AlertItem = { type: string; msg: string };

function formatMoney(n: number) {
  return n.toLocaleString("tr-TR");
}

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
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
  return <>{count.toLocaleString("tr-TR")}{suffix}</>;
}

function RingChart({ debt, recv, cash }: { debt: number; recv: number; cash: number }) {
  const total = debt + recv + cash || 1;
  const debtPct = (debt / total) * 100;
  const recvPct = (recv / total) * 100;
  const cashPct = (cash / total) * 100;
  const r = 50, c = 2 * Math.PI * r;
  const debtDash = (debtPct / 100) * c;
  const recvDash = (recvPct / 100) * c;
  const cashDash = (cashPct / 100) * c;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1a2e38" strokeWidth="12" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="#ef4444" strokeWidth="12"
          strokeDasharray={`${debtDash} ${c}`} strokeDashoffset="0" strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }} />
        <circle cx="60" cy="60" r={r} fill="none" stroke="#22c55e" strokeWidth="12"
          strokeDasharray={`${recvDash} ${c}`} strokeDashoffset={`${-debtDash}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }} />
        <circle cx="60" cy="60" r={r} fill="none" stroke="#3b82f6" strokeWidth="12"
          strokeDasharray={`${cashDash} ${c}`} strokeDashoffset={`${-(debtDash + recvDash)}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-[#8696a0]">Net</span>
        <span className={`text-lg font-bold ${(cash + recv - debt) < 0 ? "text-red-400" : "text-emerald-400"}`}>
          {formatMoney(cash + recv - debt)} ₺
        </span>
      </div>
    </div>
  );
}

function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px] text-[#8696a0] font-medium">{Math.round(d.value * 100)}%</span>
          <div className="w-full rounded-t-md" style={{
            height: `${(d.value / max) * 100}%`,
            background: d.color,
            minHeight: "4px",
            transition: "height 0.8s ease",
          }} />
          <span className="text-[9px] text-[#8696a0] text-center leading-tight truncate w-full">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [platforms, setPlatforms] = useState<any>(null);
  const [radar, setRadar] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then(r => r.json()).catch(() => null),
      fetch("/api/alerts").then(r => r.json()).catch(() => ({ alerts: [] })),
      fetch("/api/platforms").then(r => r.json()).catch(() => null),
      fetch("/api/radar").then(r => r.json()).catch(() => null),
    ]).then(([dash, al, plat, rad]) => {
      if (dash && dash.financial) setData(dash);
      setAlerts(al?.alerts || []);
      if (plat && plat.categories) setPlatforms(plat);
      if (rad && rad.trends) setRadar(rad);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <main className="gradient-bg min-h-screen text-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" style={{ animation: "spin-slow 1s linear infinite" }} />
            <p className="text-[#8696a0]">Dashboard yükleniyor...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="gradient-bg min-h-screen text-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-xl text-[#8696a0]">⚠️ Backend bağlantısı kurulamadı</p>
          <p className="text-sm text-[#8696a0]">uvicorn main:app --port 8000 çalıştığından emin ol</p>
        </div>
      </main>
    );
  }

  const fin = data.financial;
  const inv = data.inventory;
  const criticalAlerts = alerts.filter(a => a.type === "critical");
  const warningAlerts = alerts.filter(a => a.type === "warning");
  const infoAlerts = alerts.filter(a => a.type === "info");

  const platformColors: Record<string, string> = {
    trendyol: "#f97316",
    hepsiburada: "#8b5cf6",
    amazon_tr: "#3b82f6",
    n11: "#22c55e",
    ciceksepeti: "#ec4899",
    ptt_avm: "#eab308"
  };

  const platformBars = platforms?.categories?.kozmetik ? 
    Object.entries(platforms.categories.kozmetik).map(([key, val]) => ({
      label: key === "amazon_tr" ? "Amazon" : key === "ciceksepeti" ? "Çiçek" : key.charAt(0).toUpperCase() + key.slice(1),
      value: val as number,
      color: platformColors[key] || "#8696a0"
    })) : [
    { label: "Trendyol", value: 0.15, color: "#f97316" },
    { label: "Hepsi", value: 0.14, color: "#8b5cf6" },
    { label: "Amazon", value: 0.15, color: "#3b82f6" },
    { label: "N11", value: 0.13, color: "#22c55e" },
    { label: "Çiçek", value: 0.18, color: "#ec4899" },
  ];

  return (
    <main className="gradient-bg min-h-screen text-white pb-20">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 pt-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4" style={{ animation: "slideUp 0.5s ease" }}>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              📊 <span className="gradient-text">{data.store_name}</span>
            </h1>
            <p className="text-sm text-[#8696a0] mt-1">Anlık mali durum ve stok takibi</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => window.print()} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-sm hover:bg-white/10 hover:scale-105 transition-all shadow-lg hidden sm:block">
              📥 Rapor İndir
            </button>
            <Link href="/chat" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-sm hover:scale-105 transition-all shadow-lg shadow-emerald-900/30">
              💬 AI ile Konuş
            </Link>
          </div>
        </div>

        {/* Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="glass rounded-2xl p-4 mb-6 border border-red-800/30 alert-pulse" style={{ animation: "slideUp 0.5s ease 0.1s both" }}>
            <h3 className="text-sm font-bold text-red-400 mb-2">🚨 Kritik Uyarılar (Yapay Zeka Analizi)</h3>
            <div className="flex flex-col gap-2">
              {criticalAlerts.map((a, i) => {
                const isRisk = a.msg.includes("TAHSİLAT RİSKİ");
                const isLoss = a.msg.includes("ZARARINA SATIŞ");
                const icon = isRisk ? "⚠️" : isLoss ? "📉" : "🔴";
                const bg = isRisk ? "bg-orange-900/30 border border-orange-700/50" : isLoss ? "bg-red-900/30 border border-red-700/50" : "bg-red-900/20 border border-red-800/30";
                const textCol = isRisk ? "text-orange-300" : "text-red-300";
                
                return (
                  <div key={i} className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${bg} ${textCol}`}>
                    <span className="text-base leading-none mt-0.5">{icon}</span>
                    <span className="leading-relaxed font-medium">{a.msg.replace(/🚨 |📉 |🔴 /g, "")}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Financial Ring */}
          <div className="glass rounded-2xl p-6" style={{ animation: "slideUp 0.5s ease 0.15s both" }}>
            <h3 className="text-sm font-bold text-[#aebac1] mb-4">💰 Nakit Akışı</h3>
            <RingChart debt={fin.total_debt} recv={fin.total_receivable} cash={fin.cash} />
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-red-500 rounded-full" /> Borç</span>
                <span className="font-semibold text-red-400">{formatMoney(fin.total_debt)} ₺</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-500 rounded-full" /> Alacak</span>
                <span className="font-semibold text-green-400">{formatMoney(fin.total_receivable)} ₺</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-blue-500 rounded-full" /> Nakit</span>
                <span className="font-semibold text-blue-400">{formatMoney(fin.cash)} ₺</span>
              </div>
            </div>
            
            {/* Mini Cash Flow Sparkline */}
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-[#8696a0] font-medium">📈 Nakit Akışı Trendi (Son 7 Gün)</span>
              </div>
              <svg viewBox="0 0 200 40" className="w-full h-10">
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(0,168,132,0.3)" />
                    <stop offset="100%" stopColor="rgba(0,168,132,0)" />
                  </linearGradient>
                </defs>
                <path d="M0,32 L28,28 L57,35 L85,22 L114,25 L142,15 L171,18 L200,10" fill="none" stroke="#00a884" strokeWidth="2" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 4px rgba(0,168,132,0.5))" }}>
                  <animate attributeName="stroke-dasharray" from="0 500" to="500 0" dur="1.5s" fill="freeze" />
                </path>
                <path d="M0,32 L28,28 L57,35 L85,22 L114,25 L142,15 L171,18 L200,10 L200,40 L0,40 Z" fill="url(#sparkGrad)" opacity="0.5">
                  <animate attributeName="opacity" from="0" to="0.5" dur="1.5s" fill="freeze" />
                </path>
              </svg>
            </div>
            
            {/* Esnaf Score & Depreciation */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#aebac1]">🛡️ Sağlam Esnaf Skoru</span>
                <span className={`text-sm font-black ${(fin.esnaf_score || 0) < 70 ? "text-orange-400" : "text-emerald-400"}`}>
                  <AnimatedCounter target={fin.esnaf_score || 85} /><span className="text-[10px] text-[#8696a0]">/100</span>
                </span>
              </div>
              <div className="w-full bg-[#111b21] rounded-full h-1.5 overflow-hidden">
                <div className={`h-full ${(fin.esnaf_score || 0) < 70 ? "bg-orange-500" : "bg-emerald-500"}`} style={{ width: `${fin.esnaf_score || 85}%`, transition: "width 1.5s ease-out" }} />
              </div>
              
              {fin.assets && fin.assets.length > 0 && (
                <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-3 mt-4">
                  <div className="text-[10px] text-red-400 font-bold mb-1">⚠️ GİZLİ ZARAR (Aylık Yıpranma)</div>
                  {fin.assets.map((a, i) => (
                    <div key={i} className="flex justify-between text-[10px] text-[#8696a0]">
                      <span>{a.name}</span>
                      <span className="text-red-300">-{formatMoney(a.monthly_depreciation)} ₺</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Inventory Summary */}
          <div className="glass rounded-2xl p-6" style={{ animation: "slideUp 0.5s ease 0.2s both" }}>
            <h3 className="text-sm font-bold text-[#aebac1] mb-4">📦 Stok Durumu</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-3 text-center hover:bg-white/10 transition-colors">
                <div className="text-2xl font-black gradient-text">
                  <AnimatedCounter target={inv.total_products} />
                </div>
                <div className="text-[10px] text-[#8696a0]">Toplam Ürün</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center hover:bg-white/10 transition-colors">
                <div className="text-2xl font-black text-emerald-400">
                  <AnimatedCounter target={inv.potential_profit} suffix="₺" />
                </div>
                <div className="text-[10px] text-[#8696a0]">Potansiyel Kâr</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center hover:bg-white/10 transition-colors">
                <div className="text-2xl font-black text-red-400">
                  <AnimatedCounter target={inv.out_of_stock?.length || 0} />
                </div>
                <div className="text-[10px] text-[#8696a0]">Biten Ürün</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center hover:bg-white/10 transition-colors">
                <div className="text-2xl font-black text-amber-400">
                  <AnimatedCounter target={inv.low_stock?.length || 0} />
                </div>
                <div className="text-[10px] text-[#8696a0]">Azalan Stok</div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="flex justify-between text-xs">
                <span className="text-[#8696a0]">Stok Değeri</span>
                <span className="font-semibold text-white">{formatMoney(inv.total_stock_value)} ₺</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-[#8696a0]">Raf Değeri</span>
                <span className="font-semibold text-white">{formatMoney(inv.total_retail_value)} ₺</span>
              </div>
            </div>
          </div>

          {/* Platform Comparison */}
          <div className="glass rounded-2xl p-6" style={{ animation: "slideUp 0.5s ease 0.25s both" }}>
            <h3 className="text-sm font-bold text-[#aebac1] mb-4">🛒 Kozmetik Komisyonları</h3>
            <BarChart data={platformBars} />
            <p className="text-[10px] text-[#8696a0] mt-3 text-center">N11 en düşük komisyon (%13)</p>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Transactions */}
          <div className="glass rounded-2xl p-6" style={{ animation: "slideUp 0.5s ease 0.3s both" }}>
            <h3 className="text-sm font-bold text-[#aebac1] mb-4">📋 Son İşlemler</h3>
            <div className="space-y-3">
              {fin.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${item.type === "borc" ? "bg-red-900/30 text-red-400" : "bg-green-900/30 text-green-400"}`}>
                    {item.type === "borc" ? "↗" : "↙"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{item.name}</div>
                    <div className="text-[10px] text-[#8696a0] flex items-center gap-1.5 mt-0.5">
                      <span>{item.date}</span>
                      {item.instrument_type && (
                        <span className="px-1.5 py-0.5 bg-white/10 rounded-md text-[9px] uppercase tracking-wider">{item.instrument_type.replace('_', ' ')}</span>
                      )}
                      {item.risk_score && item.risk_score > 50 && (
                        <span className="text-orange-400 font-bold">⚠️ Riskli</span>
                      )}
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${item.type === "borc" ? "text-red-400" : "text-green-400"}`}>
                    {item.type === "borc" ? "-" : "+"}{formatMoney(item.amount)} ₺
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts + Calendar */}
          <div className="glass rounded-2xl p-6" style={{ animation: "slideUp 0.5s ease 0.35s both" }}>
            <h3 className="text-sm font-bold text-[#aebac1] mb-4">🔔 Uyarılar & Takvim</h3>
            <div className="space-y-2">
              {warningAlerts.map((a, i) => (
                <div key={`w-${i}`} className="text-xs bg-amber-900/20 text-amber-300 rounded-lg px-3 py-2 border border-amber-800/20">{a.msg}</div>
              ))}
              {infoAlerts.map((a, i) => (
                <div key={`i-${i}`} className="text-xs bg-blue-900/20 text-blue-300 rounded-lg px-3 py-2 border border-blue-800/20">{a.msg}</div>
              ))}
              {alerts.length === 0 && (
                <p className="text-xs text-[#8696a0] text-center py-4">✅ Şu an uyarı yok, her şey yolunda!</p>
              )}
            </div>
          </div>

          {/* Radar */}
          {radar && (
            <div className="glass rounded-2xl p-6" style={{ animation: "slideUp 0.5s ease 0.4s both" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#aebac1]">📡 Mahalle Radarı</h3>
                <span className="text-xs px-2 py-1 bg-white/5 rounded-md text-emerald-400">{radar.location}</span>
              </div>
              <div className="space-y-3">
                {radar.trends?.map((t, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-sm font-medium text-white">{t.product_name}</div>
                      <div className="text-xs font-bold text-emerald-400">+{t.demand_increase_percent}% Talep</div>
                    </div>
                    <div className="text-[10px] text-[#8696a0] leading-relaxed">{t.insight}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
