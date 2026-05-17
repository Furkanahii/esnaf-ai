# 🏪 Esnaf.AI — Otonom Esnaf Asistanı

**BTK & Google Hackathon 2026** projesi. Türkiye'deki geleneksel esnafı dijital ekonomiye entegre eden, LangGraph tabanlı otonom yapay zeka asistanı.

## 🚀 Özellikler

- 🧠 **LangGraph Supervisor Agent** — 5 uzman ajanı yöneten otonom orkestratör
- 🔍 **Vision Agent** — Gemini Vision ile defter/fiş fotoğrafından veri çıkarma
- 📊 **Financial Analyst** — Nakit akışı analizi ve kritik uyarılar
- 🛒 **E-Commerce Agent** — 5 platform karşılaştırmalı ilan hazırlama (Hybrid RAG)
- 📦 **Inventory Agent** — Stok takibi, düşük stok uyarıları, sipariş önerileri
- 🎙️ **Sesli Komut** — Web Speech API ile Türkçe ses tanıma
- 💬 **WhatsApp Clone UI** — Esnaf dostu, sıfır öğrenme eğrisi
- 🛡️ **Hybrid RAG** — Komisyon, vergi, kargo, SGK oranları yapılandırılmış DB'den (halüsinasyon yok)
- ✅ **Human-in-the-loop** — İlan yayınlamadan önce esnaf onayı zorunlu
- 📊 **Dashboard** — Nakit akışı grafiği, stok durumu, platform karşılaştırması, proaktif uyarılar
- 🔔 **Proaktif Uyarılar** — Düşük stok, vadesi yaklaşan borçlar, vergi takvimi hatırlatmaları

## 🏗️ Mimari

```
┌─────────────────────────────────────────────────────┐
│                    KULLANICI                         │
│     WhatsApp Clone UI + Sesli Komut + Fotoğraf       │
└───────────────────────┬─────────────────────────────┘
                        │ SSE Stream
                        ▼
┌─────────────────────────────────────────────────────┐
│              🧠 SUPERVISOR AGENT                     │
│         (LangGraph Orkestratör — Akıllı Yönlendirme) │
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
            └───────────────┘
```

## 🏗️ Tech Stack

| Katman | Teknoloji |
|:-------|:---------|
| Frontend | Next.js 16 + TailwindCSS 4 + TypeScript |
| Backend | FastAPI + Uvicorn |
| AI | Google Gemini 2.0 Flash + LangGraph + LangChain |
| Streaming | Server-Sent Events (SSE) |
| Design | Glassmorphism + Gradient Animations + Inter Font |

## ⚡ Kurulum

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# .env dosyasını oluştur
echo "GOOGLE_API_KEY=buraya_gercek_key" > .env

uvicorn main:app --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini aç.

## 📁 Proje Yapısı

```
esnaf-ai/
├── backend/
│   ├── agent.py              # LangGraph Supervisor + 5 Uzman Agent
│   ├── main.py               # FastAPI + SSE + Dashboard API
│   ├── requirements.txt
│   └── data/
│       ├── commission_rates.json  # Hybrid RAG — komisyon oranları (5 platform)
│       ├── tax_rules.json         # Hybrid RAG — vergi kuralları
│       ├── inventory_demo.json    # Demo envanter (20 ürün)
│       ├── kargo_rates.json       # Kargo fiyat tablosu (5 şirket)
│       ├── sgk_rules.json         # Bağkur/SGK prim bilgileri
│       └── calendar.json          # Vergi takvimi hatırlatmaları
│
└── frontend/
    └── src/app/
        ├── page.tsx               # Landing Page (Hero + Features)
        ├── chat/page.tsx          # WhatsApp Clone Chat UI
        ├── dashboard/page.tsx     # Analytics Dashboard
        ├── components/
        │   ├── Navbar.tsx         # Responsive Navigation
        │   └── MarkdownRenderer.tsx # Markdown → HTML
        ├── layout.tsx             # SEO + Fonts
        └── globals.css            # Glassmorphism + Animations
```

## 🧪 API Endpoints

```bash
# Chat (SSE Stream)
curl -N "http://localhost:8000/stream?message=merhaba"

# Dashboard Data
curl http://localhost:8000/api/dashboard

# Proactive Alerts
curl http://localhost:8000/api/alerts

# Platform Comparison
curl http://localhost:8000/api/platforms
```

## 📱 Sayfalar

| Sayfa | URL | Açıklama |
|:------|:----|:---------|
| Landing | `/` | Hero, Features, Stats, Tech Stack, Architecture |
| Chat | `/chat` | WhatsApp-style AI chat with SSE streaming |
| Dashboard | `/dashboard` | Ring charts, bar charts, alerts, transactions |

## 👥 Takım

BTK & Google Hackathon 2026
