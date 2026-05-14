# 🏪 Esnaf.AI — Otonom Esnaf Asistanı

**BTK Hackathon 2026** projesi. Türkiye'deki geleneksel esnafı dijital ekonomiye entegre eden, LangGraph tabanlı otonom yapay zeka asistanı.

## 🚀 Özellikler

- 🧠 **LangGraph Supervisor Agent** — 3 uzman ajanı yöneten otonom orkestratör
- 🔍 **Vision Agent** — Gemini Vision ile defter/fiş fotoğrafından veri çıkarma
- 📊 **Financial Analyst** — Nakit akışı analizi ve kritik uyarılar
- 🛒 **E-Commerce Agent** — 5 platform karşılaştırmalı ilan hazırlama (Hybrid RAG)
- 🎙️ **Sesli Komut** — Web Speech API ile Türkçe ses tanıma
- 💬 **WhatsApp Clone UI** — Esnaf dostu, sıfır öğrenme eğrisi
- 🛡️ **Hybrid RAG** — Komisyon ve vergi oranları yapılandırılmış DB'den (halüsinasyon yok)
- ✅ **Human-in-the-loop** — İlan yayınlamadan önce esnaf onayı zorunlu

## 🏗️ Tech Stack

| Katman | Teknoloji |
|:-------|:---------|
| Frontend | Next.js 16 + TailwindCSS 4 + TypeScript |
| Backend | FastAPI + Uvicorn |
| AI | Google Gemini 1.5 Flash + LangGraph + LangChain |
| Streaming | Server-Sent Events (SSE) |

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
│   ├── agent.py              # LangGraph Supervisor + Uzman Ajanlar
│   ├── main.py               # FastAPI + SSE Streaming
│   ├── requirements.txt
│   └── data/
│       ├── commission_rates.json  # Hybrid RAG — komisyon oranları
│       └── tax_rules.json         # Hybrid RAG — vergi kuralları
│
└── frontend/
    └── src/app/
        ├── page.tsx           # WhatsApp clone Chat UI
        ├── layout.tsx         # Next.js layout
        └── globals.css        # Stiller
```

## 🧪 API Test

```bash
# Defter analizi
curl -N "http://localhost:8000/stream?message=defterin%20fotoğrafına%20bak"

# E-ticaret
curl -N "http://localhost:8000/stream?message=kozmetik%20satmak%20istiyorum"

# Mali durum
curl -N "http://localhost:8000/stream?message=durumum%20nedir"
```

## 👥 Takım

BTK & Google Hackathon 2026
