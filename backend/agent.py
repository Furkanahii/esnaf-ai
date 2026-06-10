"""
Esnaf.AI — LangGraph Supervisor Agent v4.0
Hackathon-ready: 5-agent system with inventory, proactive alerts, expanded RAG.
"""
import os
import json
import base64
import re
from datetime import datetime
from typing import TypedDict, Annotated, Sequence, Optional
import operator
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from dotenv import load_dotenv

load_dotenv()

# --- Gemini Client Setup ---
gemini_model = None

try:
    import google.generativeai as genai
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if api_key and not api_key.startswith("mock"):
        genai.configure(api_key=api_key)
        gemini_model = genai.GenerativeModel("gemini-2.0-flash")
        print("✅ Gemini API aktif — Gerçek AI modu")
    else:
        print("⚠️ Mock modu aktif — Demo verileriyle çalışıyor")
except ImportError:
    print("⚠️ google-generativeai yüklü değil — Mock modu")


# --- STATE ---
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    image_b64: Optional[str]
    kritik_nakit_acigi: bool
    extracted_financial_data: Optional[dict]
    ecommerce_draft_ready: bool
    next_agent: str
    active_agent: str
    proactive_alerts: Optional[list]
    financial_risk_report: Optional[dict]
    market_insights: Optional[list]
    thought_process: Optional[list]


# --- GEMINI HELPER ---
def call_gemini(prompt: str, image_b64: str = None) -> str:
    if not gemini_model:
        return None
    try:
        if image_b64:
            image_data = base64.b64decode(image_b64)
            resp = gemini_model.generate_content([
                prompt,
                {"mime_type": "image/jpeg", "data": image_data}
            ], request_options={"timeout": 10.0})
        else:
            resp = gemini_model.generate_content(prompt, request_options={"timeout": 10.0})
        return resp.text
    except Exception as e:
        print(f"Gemini API error: {e}")
        return None


# --- TURKISH-AWARE SMART ROUTING ---
def normalize_turkish(text: str) -> str:
    """Normalize Turkish characters for fuzzy matching."""
    mapping = {'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
               'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'}
    result = text
    for tr_char, ascii_char in mapping.items():
        result = result.replace(tr_char, ascii_char)
    return result.lower()


def detect_intent(text: str, has_image: bool) -> str:
    """Detect user intent from message using LLM semantic routing — returns agent name."""
    if has_image:
        return "vision_agent"
    
    # Semantic Routing Prompt
    prompt = f"""Sen bir yapay zeka yönlendiricisisin (Semantic Router).
Kullanıcının mesajını analiz et ve en uygun uzman ajanı seç.
Mesaj: "{text}"

Ajanlar ve Görevleri:
- "vision_agent": Fotoğraf, belge, defter, fiş, fatura okuma ve analiz işlemleri.
- "financial_analyst_agent": Borç, alacak, bakiye, mali durum, kar/zarar analizi, kâr, zarar hesaplama, tahsilat.
- "ecommerce_agent": Ürün satma, ilan açma, platform komisyonları, e-ticaret siteleri (Trendyol vb.).
- "inventory_agent": Stok durumu, envanter, ürün sayıları, depo kontrolü, azalan ürünler, ne var ne yok.
- "neighborhood_agent": Mahalle trendleri, piyasa durumu, rakip fiyat analizi.
- "general_chat": Sadece selamlaşma veya yukarıdakilere uymayan genel sohbet/sorular.

Yanıtın SADECE ajan adından (string) oluşmalıdır. Başka hiçbir açıklama, noktalama işareti veya metin yazma."""

    result = call_gemini(prompt)
    if result:
        res = result.strip().lower()
        valid_agents = [
            "vision_agent", "financial_analyst_agent", "ecommerce_agent",
            "inventory_agent", "neighborhood_agent", "general_chat"
        ]
        for va in valid_agents:
            if va in res:
                return va
                
    # Fallback keyword matching (if LLM fails)
    normalized = normalize_turkish(text)
    if any(w in normalized for w in ["foto", "resim", "defter", "fis", "fatura"]): return "vision_agent"
    if any(w in normalized for w in ["durum", "borc", "alacak", "nakit", "para", "mali"]): return "financial_analyst_agent"
    if any(w in normalized for w in ["stok", "envanter", "urun", "depo"]): return "inventory_agent"
    if any(w in normalized for w in ["sat", "ilan", "trendyol", "hepsiburada", "e-ticaret"]): return "ecommerce_agent"
    if any(w in normalized for w in ["mahalle", "piyasa", "rakip", "trend"]): return "neighborhood_agent"
    
    return "general_chat"


# --- HYBRID RAG TOOLS ---
def get_commission_rate(platform: str, category: str) -> float:
    try:
        with open(os.path.join(os.path.dirname(__file__), "data", "commission_rates.json"), "r") as f:
            rates = json.load(f)
        return rates.get(platform.lower(), {}).get(category.lower(), -1.0)
    except:
        return -1.0


def get_tax_info(business_type: str) -> dict:
    try:
        with open(os.path.join(os.path.dirname(__file__), "data", "tax_rules.json"), "r") as f:
            rules = json.load(f)
        return rules.get(business_type.lower(), rules.get("default", {}))
    except:
        return {"kdv": 0.20, "note": "Varsayılan %20 KDV"}


def compare_all_platforms(category: str) -> str:
    try:
        with open(os.path.join(os.path.dirname(__file__), "data", "commission_rates.json"), "r") as f:
            all_rates = json.load(f)
    except:
        return ""
    comparisons = []
    for platform, categories in all_rates.items():
        rate = categories.get(category.lower(), -1)
        if rate > 0:
            comparisons.append((platform, rate))
    if not comparisons:
        return ""
    comparisons.sort(key=lambda x: x[1])
    lines = ["📊 **Platform Karşılaştırması:**"]
    for p, r in comparisons:
        marker = " ⭐ EN UCUZ" if p == comparisons[0][0] else ""
        lines.append(f"  • {p.replace('_', ' ').title()}: %{int(r*100)} komisyon{marker}")
    return "\n".join(lines)


def get_inventory_data() -> dict:
    try:
        with open(os.path.join(os.path.dirname(__file__), "data", "inventory_demo.json"), "r") as f:
            return json.load(f)
    except:
        return {"products": [], "summary": {}}


def get_kargo_rates() -> dict:
    try:
        with open(os.path.join(os.path.dirname(__file__), "data", "kargo_rates.json"), "r") as f:
            return json.load(f)
    except:
        return {}


def get_sgk_info() -> dict:
    try:
        with open(os.path.join(os.path.dirname(__file__), "data", "sgk_rules.json"), "r") as f:
            return json.load(f)
    except:
        return {}


def get_upcoming_deadlines() -> list:
    try:
        with open(os.path.join(os.path.dirname(__file__), "data", "calendar.json"), "r") as f:
            cal = json.load(f)
        now = datetime.now()
        months_tr = {1:"ocak",2:"subat",3:"mart",4:"nisan",5:"mayis",6:"haziran",
                     7:"temmuz",8:"agustos",9:"eylul",10:"ekim",11:"kasim",12:"aralik"}
        month_key = months_tr.get(now.month, "")
        events = cal.get("2026", {}).get(month_key, [])
        upcoming = [e for e in events if e["gun"] >= now.day]
        return upcoming[:3]
    except:
        return []


def get_neighborhood_trends() -> dict:
    try:
        with open(os.path.join(os.path.dirname(__file__), "data", "neighborhood_trends.json"), "r") as f:
            return json.load(f)
    except:
        return {"location": "Bilinmiyor", "trends": []}

# --- FINANCIAL ALGORITHMS ---
def calculate_discount_loss(amount: float, days_to_due: int, annual_rate: float = 0.60) -> float:
    """Senet/Çek iskonto (kırdırma) zararını hesaplar. Varsayılan yıllık faiz %60."""
    if days_to_due <= 0:
        return 0.0
    daily_rate = annual_rate / 365
    loss = amount * daily_rate * days_to_due
    return round(loss, 2)

def calculate_collection_risk(amount: float, delay_days: int) -> int:
    """Tahsilat riski skorunu hesaplar (Risk = Gecikme * Tutar çarpanı, 0-100 arası normalize)"""
    if delay_days <= 0:
        return 0
    # Basit skorlama: Gecikme günü ve tutar bazlı
    raw_score = (delay_days * 2) + (amount / 1000)
    return min(100, int(raw_score))

def calculate_health_score(net_cash: float, risk_scores: list, depreciation: float) -> int:
    """Esnaf Sağlamlık Skoru (0-100)"""
    score = 80
    if net_cash < 0:
        score -= 20
    else:
        score += min(15, int(net_cash / 1000))
    avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0
    if avg_risk > 50:
        score -= 15
    if depreciation > 0:
        score -= 5 # penalty for heavy depreciation burden without proper reserve
    return max(0, min(100, int(score)))

def build_proactive_alerts(financial_data: dict = None) -> list:
    alerts = []
    
    if financial_data:
        for item in financial_data.get("items", []):
            if item.get("risk_score", 0) > 70:
                alerts.append({"type": "critical", "msg": f"🚨 TAHSİLAT RİSKİ: {item['name']} ({item['risk_score']}/100 Risk)"})
                
    inv = get_inventory_data()
    for p in inv.get("products", []):
        if p.get("market_cost") and p.get("sell_price") and p["sell_price"] < p["market_cost"]:
            alerts.append({"type": "critical", "msg": f"📉 ZARARINA SATIŞ: {p['name']} (Rayiç: {p['market_cost']}₺, Satış: {p['sell_price']}₺)"})
        elif p["stock"] == 0:
            alerts.append({"type": "critical", "msg": f"🔴 {p['name']} STOKTA YOK!"})
        elif p["stock"] <= p["min_stock"]:
            alerts.append({"type": "warning", "msg": f"⚠️ {p['name']} azaldı ({p['stock']} adet)"})
    deadlines = get_upcoming_deadlines()
    for d in deadlines:
        alerts.append({"type": "info", "msg": f"📅 {d['gun']}. gün: {d['islem']}"})
    return alerts


# --- AGENT NODES ---

def supervisor_node(state: AgentState):
    """Supervisor — Routes to expert agents or handles general chat."""
    messages = state.get("messages", [])
    
    # Find the last HUMAN message (not AI)
    last_msg = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_msg = m.content
            break
    
    has_image = bool(state.get("image_b64"))
    intent = detect_intent(last_msg, has_image)
    
    # Route messages
    route_responses = {
        "vision_agent": "📸 Fotoğrafı aldım abi, hemen analiz ediyorum...",
        "financial_analyst_agent": "📊 Hesaplara bakıyorum abi, bir saniye...",
        "ecommerce_agent": "🛒 E-ticaret detaylarını hazırlıyorum abi...",
        "inventory_agent": "📦 Stok bilgilerini kontrol ediyorum abi...",
        "neighborhood_agent": "📡 Mahalledeki piyasa durumuna bakıyorum abi...",
    }
    
    thought_process = [
        f"Kullanıcı mesajı analiz edildi: '{last_msg}'",
        f"Semantic Router '{intent}' ajanına yönlendirme kararı aldı."
    ]
    
    alerts = build_proactive_alerts(state.get("extracted_financial_data"))
    
    if intent in route_responses:
        return {
            "messages": [AIMessage(content=route_responses[intent])],
            "next_agent": intent,
            "active_agent": "supervisor",
            "proactive_alerts": alerts,
            "thought_process": thought_process,
        }
    
    # General chat — try Gemini first, then smart mock
    gemini_prompt = f"""Sen Esnaf.AI'sın — Türk esnafının dijital asistanı. Samimi, bilgili ve yardımsever bir esnaf ağabeyi gibi konuş.

Yapabileceklerin:
1. 📸 Defter/fiş/fatura fotoğrafından veri çıkarma
2. 📊 Mali durum analizi (borç, alacak, nakit akışı)
3. 🛒 E-ticaret ilan hazırlama (5 platformda karşılaştırmalı)
4. 💰 Vergi hesaplama

Kullanıcı mesajı: "{last_msg}"

Samimi esnaf diliyle kısa yanıt ver. Yapabileceklerinden bahset ama liste halinde değil, doğal konuşma şeklinde. 2-3 cümle max."""

    gemini_result = call_gemini(gemini_prompt)
    
    if gemini_result:
        response = gemini_result.strip()
    else:
        # Smart mock — contextual and engaging
        response = (
            f"Hayırlı işler abi! 🤝 Sana nasıl yardımcı olabileceğimi anlatayım:\n\n"
            f"📸 Veresiye defterinin fotoğrafını çek, ben okuyup sana borç-alacak tablosu çıkarayım.\n"
            f"📊 \"Durumum nedir\" de, kasanın röntgenini çekeyim.\n"
            f"🛒 \"Şampuan satmak istiyorum\" de, 5 platformda en düşük komisyonlu ilanı hazırlayayım.\n\n"
            f"Ne yapalım abi?"
        )
    
    return {
        "messages": [AIMessage(content=response)],
        "next_agent": END,
        "active_agent": "supervisor",
        "thought_process": thought_process + ["Genel sohbet yanıtı oluşturuldu."]
    }


def vision_agent_node(state: AgentState):
    """Vision Agent — Analyzes photos or provides demo data."""
    image_b64 = state.get("image_b64")
    extracted_data = None
    thought_process = ["Görme (Vision) ajanı devreye girdi."]
    
    if image_b64:
        thought_process.append("OCR işlemi başlatıldı, görseldeki finansal veriler ayıklanıyor...")
        vision_prompt = """Bu bir Türk esnafının veresiye defteri, fişi veya faturasının fotoğrafı.
Görseldeki TÜM finansal verileri çıkar ve SADECE şu JSON formatında yanıt ver:
{
  "items": [
    {"name": "Kişi/Firma adı", "amount": sayısal_tutar, "type": "borc|alacak", "date": "tarih_varsa"}
  ],
  "total_debt": toplam_borc,
  "total_receivable": toplam_alacak,
  "cash": tahmini_nakit,
  "notes": "ek_notlar"
}
SADECE JSON döndür, başka hiçbir şey yazma."""
        
        result = call_gemini(vision_prompt, image_b64)
        if result:
            try:
                clean = result.strip()
                if clean.startswith("```"):
                    clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
                extracted_data = json.loads(clean)
                
                # Hata Toleransı: Gemini bazen field'ları unutabiliyor, array'den otomatik topla
                if "total_debt" not in extracted_data or "total_receivable" not in extracted_data:
                    items = extracted_data.get("items", [])
                    extracted_data["total_debt"] = sum(i.get("amount", 0) for i in items if i.get("type") == "borc")
                    extracted_data["total_receivable"] = sum(i.get("amount", 0) for i in items if i.get("type") == "alacak")
                if "cash" not in extracted_data:
                    extracted_data["cash"] = 0
                thought_process.append(f"Görselden {len(extracted_data.get('items', []))} adet veri başarıyla çıkarıldı.")
            except json.JSONDecodeError:
                thought_process.append("Veri okuma hatası: JSON dönüştürme başarısız oldu.")
    
    # Rich demo data when no image or Gemini unavailable
    if not extracted_data:
        thought_process.append("Görsel sağlanmadı veya analiz edilemedi, demo defter verileri yükleniyor.")
        extracted_data = {
            "items": [
                {"name": "Toptancı Ahmet Abi", "amount": 12500, "type": "borc", "date": "05.05.2026"},
                {"name": "Tuhafiyeci Veli", "amount": 8750, "type": "borc", "date": "08.05.2026"},
                {"name": "Bakkal Mehmet", "amount": 3200, "type": "alacak", "date": "10.05.2026"},
                {"name": "Terzi Fatma Hanım", "amount": 1500, "type": "alacak", "date": "12.05.2026"},
                {"name": "Kasap İbrahim", "amount": 4300, "type": "borc", "date": "03.05.2026"},
                {"name": "Manav Hüseyin", "amount": 2100, "type": "alacak", "date": "14.05.2026"},
            ],
            "total_debt": 25550,
            "total_receivable": 6800,
            "cash": 4200,
            "notes": "Veresiye defterinden 6 kayıt okundu. Toptancı Ahmet Abi'nin vadesi 3 gün önce dolmuş!"
        }

    # Format output
    borcs = [it for it in extracted_data["items"] if it["type"] == "borc"]
    alacaks = [it for it in extracted_data["items"] if it["type"] == "alacak"]
    
    borc_text = "\n".join([f"  🔴 {it['name']}: {it['amount']:,} TL ({it.get('date', '-')})" for it in borcs])
    alacak_text = "\n".join([f"  🟢 {it['name']}: {it['amount']:,} TL ({it.get('date', '-')})" for it in alacaks])
    
    msg = (
        f"📋 **Defteri okudum abi!** {len(extracted_data['items'])} kayıt buldum:\n\n"
        f"💸 **BORÇLARIMIZ:**\n{borc_text}\n\n"
        f"💰 **ALACAKLARIMIZ:**\n{alacak_text}\n\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"📊 Toplam Borç: {extracted_data['total_debt']:,} TL\n"
        f"📈 Toplam Alacak: {extracted_data['total_receivable']:,} TL\n"
        f"🏦 Kasadaki Nakit: {extracted_data['cash']:,} TL\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"📝 {extracted_data.get('notes', '')}"
    )
    
    return {
        "extracted_financial_data": extracted_data,
        "messages": [AIMessage(content=msg)],
        "next_agent": "financial_analyst_agent",
        "active_agent": "vision_agent",
        "thought_process": thought_process + ["Veri analizi tamamlandı."]
    }


def financial_analyst_node(state: AgentState):
    """Financial Analyst — Cash flow analysis and actionable advice."""
    data = state.get("extracted_financial_data")
    
    thought_process = ["Finansal analiz ajanı devreye girdi."]
    
    if not data:
        data = {"total_debt": 25550, "total_receivable": 6800, "cash": 4200, "items": []}
        thought_process.append("Mali veriler bulunamadı, demo veriler üzerinden analiz yapılıyor.")
    else:
        thought_process.append("Kullanıcının mali verileri (borç/alacak/kasa) yüklendi.")
    
    total_debt = data.get("total_debt", 0)
    total_recv = data.get("total_receivable", 0)
    cash = data.get("cash", 0)
    net = cash + total_recv - total_debt
    is_critical = net < 0
    
    if is_critical:
        thought_process.append(f"Kritik nakit açığı tespit edildi: {net} TL. Risk senaryoları çalıştırılıyor.")
    
    # Try Gemini
    sgk_info = get_sgk_info()
    bagkur_prim = sgk_info.get("bagkur", {}).get("aylik_prim_2026", {}).get("alt_sinir", 3150)
    thought_process.append(f"Tool Çağrısı: get_sgk_info() -> Bağkur Primi: {bagkur_prim} TL")
    
    # Calculate risks explicitly
    risk_report = {"high_risk_collections": [], "discount_losses": []}
    all_risks = []
    
    for item in data.get("items", []):
        if item.get("risk_score"):
            all_risks.append(item["risk_score"])
            
        # Tahsilat riski
        if item.get("type") == "alacak" and item.get("risk_score", 0) > 70:
            risk_report["high_risk_collections"].append({
                "name": item["name"],
                "amount": item["amount"],
                "risk_score": item["risk_score"]
            })
            
        # İskonto hesabı (Senet/Çek)
        if item.get("type") == "alacak" and item.get("instrument_type") in ["senet", "cek"]:
            loss = calculate_discount_loss(item["amount"], 45, 0.60)
            risk_report["discount_losses"].append({
                "name": item["name"],
                "amount": item["amount"],
                "instrument": item["instrument_type"].upper(),
                "estimated_loss": loss
            })
            
    assets = data.get("assets", [])
    total_depreciation = sum(a.get("monthly_depreciation", 0) for a in assets)
    health_score = calculate_health_score(net, all_risks, total_depreciation)
    
    # Context Builders
    depreciation_context = ""
    if total_depreciation > 0:
        depreciation_context = f"\n⚠️ AMORTİSMAN (GİZLİ ZARAR):\nDükkandaki demirbaşların (Motor, Dolap vb.) aylık yıpranma payı toplam {total_depreciation} TL. Esnaf cebinde para var sanıyor ama aslında eşyası eskiyor, bunu uyar."

    ciro_context = ""
    if is_critical:
        has_check = any(i.get("type") == "alacak" and i.get("instrument_type") in ["cek", "senet"] for i in data.get("items", []))
        owes_supplier = any(i.get("type") == "borc" for i in data.get("items", []))
        if has_check and owes_supplier:
            ciro_context = "\n💡 AKILLI ÇÖZÜM (CİRO): Bankaya çek/senet kırdırıp komisyon ödemek (iskonto) yerine, elindeki müşteri çekini toptancıya devrederek (ciro ederek) borcunu kapatmasını önerebilirsin. Bu faiz zararını engeller."

    risk_context = ""
    if risk_report["high_risk_collections"]:
        risk_context += f"\n🚨 YÜKSEK TAHSİLAT RİSKİ OLAN ALACAKLAR:\n"
        for r in risk_report["high_risk_collections"]:
            risk_context += f"- {r['name']}: {r['amount']} TL (Risk Skoru: {r['risk_score']}/100)\n"
            
    if risk_report["discount_losses"]:
        risk_context += f"\n💸 İSKONTO ZARAR ANALİZİ (Erken Kırdırma Senaryosu):\n"
        for d in risk_report["discount_losses"]:
            risk_context += f"- {d['name']} ({d['instrument']}): {d['amount']} TL. Bugün bankada kırdırılırsa yaklaşık {d['estimated_loss']} TL zarar oluşacak!\n"

    analysis_prompt = f"""Sen tecrübeli, esnaf ağzı bilen, karmaşık finansal terimleri basit örneklere indirgeyen bir danışmansın.
Aşağıdaki mali durumu analiz et ve esnafa samimi bir dille net öneriler ver:

Toplam Borç: {total_debt:,} TL | Alacak: {total_recv:,} TL | Nakit: {cash:,} TL | Net: {net:,} TL
Esnaf Sağlamlık Skoru: {health_score}/100

{depreciation_context}
{ciro_context}
{risk_context}

{"DURUM KRİTİK — nakit sıkışıklığı var! Bağkur primini bile ödemek zorlaşabilir." if is_critical else "Durum kontrol altında, kasada yeterli para var."}

3-4 cümle ile proaktif bir durum özeti yap ve 2-3 somut aksiyon önerisi ver. Açıklamalarında 'cebinden yiyorsun', 'iskonto zararı', 'ciro et', 'gizli zarar' gibi terimleri kullan ve samimi ol."""

    gemini_result = call_gemini(analysis_prompt)
    
    if gemini_result:
        msg = gemini_result.strip()
    else:
        if is_critical:
            deficit = abs(net)
            # Find oldest/largest debt for specific advice
            items = data.get("items", [])
            largest_debt = max([it for it in items if it.get("type") == "borc"], key=lambda x: x["amount"], default=None)
            largest_recv = max([it for it in items if it.get("type") == "alacak"], key=lambda x: x["amount"], default=None)
            
            advice_parts = [f"🚨 **ABİ DİKKAT! Kasada {deficit:,} TL açık var!**\n"]
            advice_parts.append(f"Net durumun: {net:,} TL (Nakit {cash:,} + Alacak {total_recv:,} - Borç {total_debt:,})\n")
            advice_parts.append("📋 **Acil Aksiyon Planı:**\n")
            
            if largest_recv:
                advice_parts.append(f"  1️⃣ Önce {largest_recv['name']}'den {largest_recv['amount']:,} TL alacağını tahsil et\n")
            else:
                advice_parts.append(f"  1️⃣ Alacaklarını ({total_recv:,} TL) hemen tahsil etmeye başla\n")
            
            advice_parts.append(f"  2️⃣ Ay sonu **{bagkur_prim:,} TL Bağkur primi** ödemen var, bunu kenara ayırmalısın!\n")
            
            if largest_debt:
                advice_parts.append(f"  3️⃣ {largest_debt['name']}'e ({largest_debt['amount']:,} TL) vade uzatma talep et\n")
            
            advice_parts.append(f"\n💡 \"Ürün satmak istiyorum\" de, sana e-ticaretle ek gelir bulayım!")
            msg = "".join(advice_parts)
        else:
            surplus = net
            msg = (
                f"✅ **Abi durum fena değil!** Kasada {surplus:,} TL fazlan var.\n\n"
                f"Net durumun: {net:,} TL (Nakit {cash:,} + Alacak {total_recv:,} - Borç {total_debt:,})\n\n"
                f"📋 **Tavsiyelerim:**\n"
                f"  1️⃣ Ay sonu **{bagkur_prim:,} TL Bağkur primini** zamanında öde, %5 indirimini kaybetme.\n"
                f"  2️⃣ Kalan borçları ({total_debt:,} TL) vadesinde öde, güven kaybetme.\n"
                f"  3️⃣ Alacakları ({total_recv:,} TL) sıkı takip et, geciktirme.\n\n"
                f"💡 \"Ürün satmak istiyorum\" de, e-ticarette işleri büyütelim!"
            )
    
    return {
        "kritik_nakit_acigi": is_critical,
        "messages": [AIMessage(content=msg)],
        "next_agent": END,
        "active_agent": "financial_analyst",
        "thought_process": thought_process + ["Finansal analiz tamamlandı, eylem önerileri oluşturuldu."]
    }


def ecommerce_agent_node(state: AgentState):
    """E-Commerce Agent — Multi-platform comparison + SEO listing."""
    category = "genel"
    
    thought_process = ["E-Ticaret ajanı devreye girdi."]
    
    messages = state.get("messages", [])
    last_user_msg = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_user_msg = m.content
            break
    
    normalized = normalize_turkish(last_user_msg)
    thought_process.append(f"Kullanıcı talebi analiz ediliyor: '{last_user_msg}'")
    
    # Detect category
    cat_keywords = {
        "kozmetik": ["sampuan", "krem", "kozmetik", "bakim", "cilt", "parfum", "makyaj"],
        "elektronik": ["telefon", "kablo", "sarj", "elektronik", "bilgisayar", "kulaklik", "tablet"],
        "giyim": ["tisort", "pantolon", "elbise", "giyim", "ayakkabi", "mont", "gomlek", "etek"],
        "gıda": ["yag", "un", "seker", "cay", "gida", "yiyecek", "bal", "peynir", "zeytin"],
        "ev_yasam": ["ev", "mutfak", "banyo", "dekor", "hali", "perde", "mobilya"],
        "spor": ["spor", "fitness", "dambil", "mat", "kosu"],
        "takı_aksesuar": ["taki", "kolye", "bileklik", "yuzuk", "aksesuar", "saat"],
    }
    for cat, keywords in cat_keywords.items():
        if any(k in normalized for k in keywords):
            category = cat
            break
    
    # Detect platform
    platform_keywords = {"trendyol": "trendyol", "hepsiburada": "hepsiburada", "amazon": "amazon_tr", "n11": "n11", "ciceksepeti": "ciceksepeti"}
    platform = None
    for kw, pname in platform_keywords.items():
        if kw in normalized:
            platform = pname
            break
    
    # Multi-platform comparison
    comparison_text = compare_all_platforms(category)
    thought_process.append(f"Tool Çağrısı: compare_all_platforms(category='{category}')")
    
    # Auto-pick cheapest platform
    if not platform:
        try:
            with open(os.path.join(os.path.dirname(__file__), "data", "commission_rates.json"), "r") as f:
                all_rates = json.load(f)
            best = min(
                ((p, cats.get(category.lower(), 1.0)) for p, cats in all_rates.items() if category.lower() in cats),
                key=lambda x: x[1], default=("trendyol", 0.20)
            )
            platform = best[0]
        except:
            platform = "trendyol"
    
    commission = get_commission_rate(platform, category)
    tax_info = get_tax_info("basit_usul")
    kdv = tax_info.get("kdv", 0.20)
    
    kargo_data = get_kargo_rates()
    # PTT Kargo'yu baz al (genelde en uygun)
    kargo_base = kargo_data.get("ptt_kargo", {}).get("base_price", 32.00)
    kargo_name = kargo_data.get("ptt_kargo", {}).get("name", "PTT Kargo")
    
    thought_process.extend([
        f"Tool Çağrısı: get_commission_rate(platform='{platform}', category='{category}') -> %{int(commission*100)}",
        f"Tool Çağrısı: get_tax_info('basit_usul') -> KDV: %{int(kdv*100)}",
        f"Tool Çağrısı: get_kargo_rates() -> {kargo_name}: {kargo_base} TL"
    ])
    
    if commission == -1.0:
        commission = 0.20
    
    # Price calculation example
    sample_cost = 100  # Example cost price
    total_cut = commission + kdv
    # Satış Fiyatı = (Maliyet + Kargo) / (1 - Komisyon - KDV)
    min_sell = int((sample_cost + kargo_base) / (1 - total_cut)) + 1
    
    # Try Gemini for creative SEO
    seo_prompt = f"""Türk e-ticaret sitesi için {category} kategorisinde ürün ilanı hazırla.
Platform: {platform}. Komisyon: %{int(commission*100)}. KDV: %{int(kdv*100)}.
Kargo Firması: {kargo_name} (Taban fiyat: {kargo_base} TL).

ÖZEL GÖREV (Cross-Sell / Sepet Stratejisi):
Tekli satışlarda kargo maliyeti kâr marjını yutuyorsa, esnafa mutlaka "Bu ürünü tek satma, kargo parasına değmez. Yanına X ve Y ürünlerini ekleyip Set/Paket olarak sat ki kargo bedavaya gelsin ve kâr et" şeklinde samimi bir 'esnaf aklı' tavsiyesi ver.

1. SEO başlık (max 80 karakter, Türkçe anahtar kelimeler)
2. Ürün açıklaması (3 cümle, müşteriyi cezbeden)
3. 100 TL maliyetli ürün için minimum satış fiyatı önerisi ve "Sepet (Set) stratejisi" tavsiyesi.
Samimi esnaf diliyle yaz."""

    gemini_result = call_gemini(seo_prompt)
    
    if gemini_result:
        seo_content = gemini_result.strip()
        msg = (
            f"🛒 **İlan taslağını hazırladım abi!**\n\n"
            f"{comparison_text}\n\n"
            f"✅ **Önerim:** {platform.replace('_', ' ').title()}'da {category} kategorisi — %{int(commission*100)} komisyon\n\n"
            f"{seo_content}\n\n"
            f"⚠️ **Yayınlayayım mı?** (Onay bekliyor)"
        )
    else:
        seo_titles = {
            "kozmetik": "Doğal Bakım Seti | Organik Kozmetik | Aynı Gün Kargo",
            "elektronik": "Premium Elektronik Aksesuar | Garantili | Hızlı Kargo",
            "giyim": "Yeni Sezon Giyim | Şık & Uygun | Ücretsiz İade",
            "gıda": "Köyden Sofraya Doğal Lezzet | Taze & Organik",
            "ev_yasam": "Modern Ev Dekorasyon | Şık Tasarım | Hızlı Kargo",
            "genel": "Süper Fırsat | Kaliteli Ürün | Aynı Gün Kargo",
        }
        seo_descs = {
            "kozmetik": "Cildinize değer verin! Doğal içerikli bakım ürünlerimiz dermatolojik olarak test edilmiştir. Binlerce müşterinin tercihi.",
            "elektronik": "Yüksek performanslı elektronik aksesuarlar. 2 yıl garanti, 14 gün ücretsiz iade hakkı.",
            "giyim": "Yeni sezon koleksiyonumuz ile tarzınızı yansıtın. Premium kumaş, özenli dikim, beden değişim garantisi.",
            "gıda": "Anadolu'nun bereketli topraklarından sofranıza. Katkısız, doğal, köy ürünleri. Taze taze kapınızda.",
            "genel": "Kaliteli ürün, uygun fiyat, hızlı kargo. Müşteri memnuniyeti garantisi ile güvenli alışveriş.",
        }
        
        title = seo_titles.get(category, seo_titles["genel"])
        desc = seo_descs.get(category, seo_descs["genel"])
        
        msg = (
            f"🛒 **İlan taslağını hazırladım abi!**\n\n"
            f"{comparison_text}\n\n"
            f"✅ **Önerim:** {platform.replace('_', ' ').title()} — %{int(commission*100)} komisyon (en avantajlı!)\n\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"📝 **SEO Başlık:** \"{title}\"\n\n"
            f"📝 **Açıklama:** {desc}\n\n"
            f"💰 **Fiyat Hesabı (100 TL maliyetli ürün için):**\n"
            f"  • Kargo Gideri ({kargo_name}): {kargo_base} TL\n"
            f"  • Komisyon: %{int(commission*100)} = {int(min_sell * commission)} TL\n"
            f"  • KDV: %{int(kdv*100)} = {int(min_sell * kdv)} TL\n"
            f"  • Minimum satış fiyatı: **{min_sell} TL**\n"
            f"  • Önerilen fiyat: **{int(min_sell * 1.15)} TL** (%15 kâr marjı)\n"
            f"━━━━━━━━━━━━━━━━━━━\n\n"
            f"⚠️ **Yayınlayayım mı?** (Onay bekliyor)"
        )
    
    return {
        "ecommerce_draft_ready": True,
        "messages": [AIMessage(content=msg)],
        "next_agent": END,
        "active_agent": "ecommerce_agent",
        "thought_process": thought_process + ["SEO uyumlu ilan ve maliyet hesaplaması tamamlandı."]
    }


def inventory_agent_node(state: AgentState):
    """Inventory Agent — Stock tracking, low stock alerts, reorder suggestions."""
    thought_process = ["Envanter (Stok) ajanı devreye girdi."]
    
    inv = get_inventory_data()
    thought_process.append("Tool Çağrısı: get_inventory_data() -> Stok verileri çekildi.")
    products = inv.get("products", [])
    summary = inv.get("summary", {})

    messages = state.get("messages", [])
    last_user_msg = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_user_msg = m.content
            break

    normalized = normalize_turkish(last_user_msg)

    # Check for specific product query
    matching = [p for p in products if normalize_turkish(p["name"]).find(normalized.split()[-1] if normalized.split() else "") >= 0]

    out_of_stock = [p for p in products if p["stock"] == 0]
    low_stock = [p for p in products if 0 < p["stock"] <= p["min_stock"]]
    healthy = [p for p in products if p["stock"] > p["min_stock"]]
    
    thought_process.append(f"Kritik stok seviyeleri hesaplanıyor: Biten ({len(out_of_stock)}), Azalan ({len(low_stock)})")

    gemini_prompt = f"""Bir esnafın stok durumunu analiz et. Samimi esnaf ağabeyi gibi konuş.
Toplam {len(products)} ürün. Stokta olmayan: {len(out_of_stock)}. Azalan: {len(low_stock)}. Sağlıklı: {len(healthy)}.
Toplam stok değeri: {summary.get('total_stock_value', 0):,} TL.
Potansiyel kâr: {summary.get('potential_profit', 0):,} TL.
Biten ürünler: {', '.join(p['name'] for p in out_of_stock)}.
Azalan ürünler: {', '.join(f"{p['name']} ({p['stock']} adet)" for p in low_stock)}.
Rayiç bedel (market_cost) altında satılan, zararına satış yapılan ürünleri analiz et (varsa vurgula).

3-4 cümle durum özeti ve 2-3 somut sipariş önerisi ver."""

    gemini_result = call_gemini(gemini_prompt)

    if gemini_result:
        msg = gemini_result.strip()
    else:
        lines = [f"📦 **Stok Raporu** — {inv.get('store_name', 'Dükkan')}\n"]
        lines.append(f"📊 **Toplam:** {len(products)} ürün | Stok Değeri: {summary.get('total_stock_value', 0):,} TL\n")

        if out_of_stock:
            lines.append("🔴 **STOKTA YOK — Acil Sipariş:**")
            for p in out_of_stock:
                lines.append(f"  • {p['name']} — Tedarikçi: {p['supplier']}")
            lines.append("")

        if low_stock:
            lines.append("⚠️ **Azalan Stoklar:**")
            for p in low_stock:
                lines.append(f"  • {p['name']}: {p['stock']} adet kaldı (min: {p['min_stock']})")
            lines.append("")

        lines.append(f"💰 **Potansiyel Kâr:** {summary.get('potential_profit', 0):,} TL")
        lines.append(f"\n💡 *Rafta yatan ürünleri e-ticarete koyarak hızlı nakit girişi sağlayabilirsin!*")
        msg = "\n".join(lines)

    return {
        "messages": [AIMessage(content=msg)],
        "next_agent": END,
        "active_agent": "inventory_agent",
        "thought_process": thought_process + ["Stok analizi tamamlandı, özet oluşturuldu."]
    }


def neighborhood_agent_node(state: AgentState):
    """Neighborhood Agent — Market intelligence and swarm insights."""
    thought_process = ["Mahalle Radarı ajanı devreye girdi."]
    
    trends_data = get_neighborhood_trends()
    location = trends_data.get("location", "Bölge")
    trends = trends_data.get("trends", [])
    thought_process.append(f"Tool Çağrısı: get_neighborhood_trends() -> {location} bölgesi trendleri çekildi.")
    
    # Get user inventory to cross-reference
    inv = get_inventory_data()
    products = inv.get("products", [])
    thought_process.append("Esnafın stok verileri dış piyasa trendleriyle çapraz eşleştiriliyor...")
    
    # Sadece 3-4 random ürünü gönderelim ki prompt limiti şişmesin
    import random
    sampled_products = random.sample(products, min(len(products), 5)) if products else []
    user_inventory_context = "\n".join([f"- {p['name']}: Stok {p['stock']} adet, Satış: {p['sell_price']} TL" for p in sampled_products])
    
    gemini_prompt = f"""Sen Esnaf.AI 'Mahalle Radarı' ajanısın. 
Şu anki konum: {location}.

Piyasadaki Güncel Trendler:
{json.dumps(trends, ensure_ascii=False)}

Esnafın Mevcut Stoğu (Örneklem):
{user_inventory_context}

Yukarıdaki dış pazar trend verilerini ve esnafın stoklarını karşılaştırarak esnafa piyasa istihbaratı ver. 
Örneğin, bölgede talebi artan bir ürün esnafta varsa "bunu vitrine çıkar" veya rakiplerin fiyatı yüksekse "fiyatını güncelle" önerisi yap.
Ayrıca, Esnaf bu ürünleri Vadeli Satmayı (açık hesap) düşünüyorsa, artan talep ve enflasyonu hesaba katarak "Vadeli satacaksan fiyatına mutlaka vade farkı (enflasyon payı) koy ki yerine yenisini koyabilesin" uyarısı ekle.
Samimi esnaf ağzıyla, 3-4 cümleyi geçmeden doğrudan (actionable) konuş.
"""
    gemini_result = call_gemini(gemini_prompt)
    if gemini_result:
        msg = gemini_result.strip()
    else:
        lines = [f"📡 **Mahalle Radarı** — {location} Analizi\n"]
        for t in trends:
            lines.append(f"  • {t['insight']}")
        lines.append(f"\n💡 *Bu verilere göre fiyatlarını ve vitrinini güncellemek istersen bana yaz abi.*")
        msg = "\n".join(lines)
        
    return {
        "messages": [AIMessage(content=msg)],
        "next_agent": END,
        "active_agent": "neighborhood_agent",
        "thought_process": thought_process + ["Rakip fiyat ve talep analizi tamamlandı."]
    }


# --- GRAPH ---
def router(state: AgentState):
    return state.get("next_agent", END)

workflow = StateGraph(AgentState)
workflow.add_node("supervisor", supervisor_node)
workflow.add_node("vision_agent", vision_agent_node)
workflow.add_node("financial_analyst_agent", financial_analyst_node)
workflow.add_node("ecommerce_agent", ecommerce_agent_node)
workflow.add_node("inventory_agent", inventory_agent_node)
workflow.add_node("neighborhood_agent", neighborhood_agent_node)

workflow.set_entry_point("supervisor")
workflow.add_conditional_edges("supervisor", router)
workflow.add_conditional_edges("vision_agent", router)
workflow.add_conditional_edges("financial_analyst_agent", router)
workflow.add_conditional_edges("ecommerce_agent", router)
workflow.add_conditional_edges("inventory_agent", router)
workflow.add_conditional_edges("neighborhood_agent", router)

app_graph = workflow.compile()


if __name__ == "__main__":
    tests = [
        "merhaba",
        "deftere bak",
        "borcum ne kadar",
        "trendyolda satabileceğim bir şey var mı",
        "şampuan satmak istiyorum",
    ]
    for t in tests:
        print(f"\n{'='*50}\n📩 USER: {t}")
        state = {
            "messages": [HumanMessage(content=t)],
            "image_b64": None, "kritik_nakit_acigi": False,
            "extracted_financial_data": None, "ecommerce_draft_ready": False,
            "next_agent": "", "active_agent": "",
        }
        for output in app_graph.stream(state):
            for key, value in output.items():
                msgs = value.get("messages", [])
                if msgs:
                    print(f"🔄 [{key}]: {msgs[-1].content[:150]}...")
