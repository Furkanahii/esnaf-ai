# 🏪 Esnaf.AI — Dijital İş Ortağın

> **BTK & Google Hackathon 2026** projesi

Türkiye'deki geleneksel esnafı dijital ekonomiye entegre eden, yapay zeka destekli otonom iş asistanı.

## 🎯 Problem

Türkiye'de 2 milyondan fazla küçük esnaf, hâlâ kâğıt defter, hesap makinesi ve tahminle iş yönetiyor. E-ticarete geçmek istiyor ama nereden başlayacağını bilmiyor. Vergi takvimlerini, komisyon oranlarını ve stok durumunu takip etmek için dijital araçlara erişimi yok.

## 💡 Çözüm

**Esnaf.AI**, WhatsApp benzeri basit bir sohbet arayüzü üzerinden çalışan, 5 uzman yapay zeka asistanından oluşan otonom bir sistemdir. Esnaf sadece konuşur veya fotoğraf çeker — gerisini sistem halleder.

## ✨ Özellikler

| Özellik | Açıklama |
|:--------|:---------|
| 📸 **Fotoğrafla Veri Okuma** | Veresiye defteri, fiş veya fatura fotoğrafından otomatik borç-alacak tablosu çıkarma (Gemini Vision) |
| 📊 **Mali Durum Analizi** | Nakit akışı, borç-alacak dengesi, tahsilat riski ve "Sağlam Esnaf Skoru" hesaplama |
| 🛒 **E-Ticaret İlan Hazırlama** | 5 platformda (Trendyol, Hepsiburada, Amazon TR, N11, Çiçeksepeti) komisyon karşılaştırması ve SEO uyumlu ilan taslağı |
| 📦 **Akıllı Stok Takibi** | 20 ürünlük envanter yönetimi, düşük stok uyarıları, otomatik sipariş önerileri |
| 📡 **Mahalle Radarı** | Bölgesel piyasa trendleri, rakip fiyat analizi ve talep değişikliği uyarıları |
| 🎙️ **Sesli Komut** | Web Speech API ile Türkçe ses tanıma desteği |
| 🛡️ **Sıfır Halüsinasyon** | Komisyon, vergi, kargo ve SGK verileri yapılandırılmış veritabanından çekiliyor (Hybrid RAG) |
| 📊 **Canlı Dashboard** | Nakit akışı grafiği, platform karşılaştırma barları, stok durumu, proaktif uyarılar |
| 🔔 **Proaktif Uyarı Sistemi** | Düşük stok, vadesi yaklaşan borçlar, zararina satış, vergi takvimi hatırlatmaları |
| 🧠 **Şeffaf Düşünce Zinciri** | Her ajanın hangi veritabanını sorguladığı ve hangi analizi yaptığı kullanıcıya adım adım gösteriliyor |

## 🏗️ Kullanılan Teknolojiler

| Katman | Teknoloji |
|:-------|:----------|
| **AI Orkestrasyon** | LangGraph (Supervisor-Agent mimarisi) |
| **Yapay Zeka** | Google Gemini 2.0 Flash (Text + Vision) |
| **Backend** | Python, FastAPI, Uvicorn |
| **Frontend** | Next.js 16, React 19, TypeScript, TailwindCSS 4 |
| **İletişim** | Server-Sent Events (SSE) — gerçek zamanlı streaming |
| **Veri Katmanı** | Hybrid RAG (JSON tabanlı yapılandırılmış veri) |
| **Tasarım** | Glassmorphism, Gradient animasyonlar, Inter font |

## 🧠 Mimari

```
KULLANICI (WhatsApp Clone UI + Sesli Komut + Fotoğraf)
         │
         ▼ SSE Stream
   🧠 SUPERVISOR AGENT (LangGraph Orkestratör — Semantic Routing)
         │
    ┌────┼────┬────┬────┬────┐
    ▼    ▼    ▼    ▼    ▼    ▼
  📸   📊   🛒   📦   📡   💬
Vision Finans E-Tic Stok Radar Genel
         │
    HYBRID RAG KATMANI
  (Komisyon | KDV | Kargo | SGK)
```

## ⚡ Kurulum (Lokal)

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
echo "GOOGLE_API_KEY=senin_api_keyin" > .env
uvicorn main:app --port 8000

# Frontend (yeni terminal)
cd frontend
npm install && npm run dev
```

Tarayıcıda → `http://localhost:3000`

## 📱 Sayfalar

| Sayfa | Açıklama |
|:------|:---------|
| `/` | Landing page — Ürün tanıtımı, özellikler, nasıl çalışır akışı |
| `/chat` | WhatsApp tarzı AI sohbet arayüzü (SSE streaming + düşünce adımları) |
| `/dashboard` | Gerçek zamanlı mali analiz, stok durumu, platform karşılaştırması, uyarılar |

## 🎥 Demo

- **🌐 Canlı Uygulama:** [https://frontend-tau-five-cwbbvtbtho.vercel.app](https://frontend-tau-five-cwbbvtbtho.vercel.app)
- **🔗 Backend API:** [https://esnaf-ai-backend-production.up.railway.app](https://esnaf-ai-backend-production.up.railway.app)
- **📹 Demo Videosu:** [YouTube linki]

## 👥 Takım

BTK & Google Hackathon 2026 — Esnaf.AI
