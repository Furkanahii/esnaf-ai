# Esnaf.AI API Schemas

Bu doküman, Next.js frontend tarafındaki "Proaktif Dashboard" bileşenlerinin tükettiği FastAPI endpoint'lerinin JSON response şemalarını açıklamaktadır.

## 1. `/api/radar` (Neighborhood Intelligence)
Bu endpoint, `mock_market_data_generator.py` tarafından üretilen bölgesel pazar istihbaratını (Getir/Trendyol trend simülasyonu) döner. Dashboard'un altındaki "📡 Mahalle Radarı" bileşeni bu veriyi kullanır.

**Method:** `GET`
**Response Schema:**
```json
{
  "location": "Kadıköy",
  "generated_at": "2026-05-17T18:10:00",
  "trends": [
    {
      "category": "gıda",
      "product_name": "Enerji İçeceği 250ml",
      "demand_increase_percent": 65,
      "competitor_avg_price": 45,
      "insight": "Getir ve Trendyol simülasyon verilerine göre Kadıköy bölgesinde 'Enerji İçeceği 250ml' talebi %65 patladı! Rakipler stok eritiyor."
    }
  ]
}
```
**Frontend Mapping:**
- `location`: "Mahalle Radarı" başlığının yanındaki etiket (badge).
- `product_name` ve `demand_increase_percent`: Her bir trend öğesinin başlığı.
- `insight`: Alt metin olarak doğrudan esnafa eyleme geçirilebilir (actionable) öneri sunar.

## 2. `/api/alerts` (Proactive Alerts)
Bu endpoint, Esnaf.AI'ın algoritmik olarak hesapladığı (Zararına Satış, Tahsilat Riski, Azalan Stok) proaktif uyarıları döner. Dashboard'un en üstündeki "🚨 Kritik Uyarılar" bileşeni bu veriyi kullanır.

**Method:** `GET`
**Response Schema:**
```json
{
  "alerts": [
    {
      "type": "critical",
      "msg": "🚨 TAHSİLAT RİSKİ: Bakkal Mehmet (85/100 Risk)"
    },
    {
      "type": "critical",
      "msg": "📉 ZARARINA SATIŞ: Dove Şampuan 400ml (Rayiç: 90₺, Satış: 85₺)"
    },
    {
      "type": "critical",
      "msg": "🔴 Nivea Krem 150ml STOKTA YOK!"
    },
    {
      "type": "warning",
      "msg": "⚠️ Pınar Süt 1L azaldı (3 adet)"
    },
    {
      "type": "info",
      "msg": "📅 24. gün: Muhtasar Beyanname"
    }
  ]
}
```
**Frontend Mapping:**
- `type`: Frontend bu değeri kullanarak arkaplan rengini belirler (`critical` için kırmızı/turuncu, `warning` için sarı, `info` için mavi).
- `msg`: String içerisindeki ikonlara (📉, ⚠️, 🚨) regex veya string matching uygulayarak UI tarafında özel görselleştirmeler (örn. Turuncu Risk Kutusu) oluşturulabilir.

## 3. `/api/dashboard` (Financial & Inventory Snapshot)
Genel durum özeti döner.

**Method:** `GET`
**Response Schema:**
```json
{
  "store_name": "Esnaf.AI",
  "financial": {
    "total_debt": 25550,
    "total_receivable": 21800,
    "cash": 2200,
    "net": -1550,
    "is_critical": true,
    "items": [
      {
        "name": "Bakkal Mehmet",
        "amount": 3200,
        "type": "alacak",
        "date": "10.05.2026",
        "instrument_type": "acik_hesap",
        "risk_score": 85
      },
      {
        "name": "Tedarikçi Cemal",
        "amount": 15000,
        "type": "alacak",
        "date": "30.06.2026",
        "instrument_type": "senet",
        "risk_score": 10
      }
    ]
  },
  "inventory": {
    "total_products": 20,
    "total_stock_value": 23840,
    "total_retail_value": 38250,
    "potential_profit": 14410,
    "out_of_stock": ["Nivea Krem 150ml"],
    "low_stock": ["Pınar Süt 1L", "Selpak Tuvalet Kağıdı 32'li"]
  }
}
```
**Frontend Mapping:**
- `instrument_type`: `senet` veya `cek` ise, listedeki elemanın yanına rozet olarak eklenir.
- `risk_score`: 50'den büyükse, yanına `⚠️ Riskli` yazılır.
