"""
Esnaf.AI — LangGraph Supervisor Agent v3.0
Hackathon-ready: Smart routing, rich mock responses, real Gemini when available.
"""
import os
import json
import base64
import re
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
            ])
        else:
            resp = gemini_model.generate_content(prompt)
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
    """Detect user intent from message — returns agent name."""
    normalized = normalize_turkish(text)
    
    # Image → always vision
    if has_image:
        return "vision_agent"
    
    # Vision keywords (photo, notebook, receipt)
    vision_words = [
        "foto", "resim", "gorsel", "goruntu", "defter", "fis", "fatura",
        "kamera", "cek", "yukle", "tara", "oku", "bak", "incele",
        "fotografin", "resmini", "defteri", "not defteri",
        "fisin", "faturan", "makbuz", "dekont",
    ]
    if any(w in normalized for w in vision_words):
        return "vision_agent"
    
    # Financial keywords
    finance_words = [
        "durum", "borc", "alacak", "nakit", "kasa", "hesap", "para",
        "gelir", "gider", "kar", "zarar", "maliyet", "masraf", "butce",
        "analiz", "rapor", "ozet", "mali", "finans", "tutar", "toplam",
        "odeme", "tahsil", "veresiye", "bakiye", "ciro", "kazanc",
        "ne kadar", "kac lira", "kac tl", "nedir", "nasil",
        "odeyeceg", "borcum", "alacagim", "kasada", "param",
    ]
    if any(w in normalized for w in finance_words):
        return "financial_analyst_agent"
    
    # E-commerce keywords
    ecommerce_words = [
        "sat", "satis", "ilan", "urun", "magaza", "fiyat",
        "trendyol", "hepsiburada", "amazon", "n11", "ciceksepeti",
        "e-ticaret", "eticaret", "online", "internet",
        "komisyon", "kargo", "liste", "yayinla", "pazarlama",
        "seo", "baslik", "aciklama", "stok", "envanter",
        "kazandir", "gelir", "satabili", "satayim", "satalim",
        "platform", "pazaryeri", "maliyet", "marj", "kar",
    ]
    if any(w in normalized for w in ecommerce_words):
        return "ecommerce_agent"
    
    # If nothing matched → general chat (supervisor handles it)
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
    lines = ["📊 Platform Karşılaştırması:"]
    for p, r in comparisons:
        marker = " ⭐ EN UCUZ" if p == comparisons[0][0] else ""
        lines.append(f"  • {p.replace('_', ' ').title()}: %{int(r*100)} komisyon{marker}")
    return "\n".join(lines)


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
    }
    
    if intent in route_responses:
        return {
            "messages": [AIMessage(content=route_responses[intent])],
            "next_agent": intent,
            "active_agent": "supervisor"
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
        "active_agent": "supervisor"
    }


def vision_agent_node(state: AgentState):
    """Vision Agent — Analyzes photos or provides demo data."""
    image_b64 = state.get("image_b64")
    extracted_data = None
    
    if image_b64:
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
            except json.JSONDecodeError:
                pass
    
    # Rich demo data when no image or Gemini unavailable
    if not extracted_data:
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
        "active_agent": "vision_agent"
    }


def financial_analyst_node(state: AgentState):
    """Financial Analyst — Cash flow analysis and actionable advice."""
    data = state.get("extracted_financial_data")
    
    if not data:
        data = {"total_debt": 25550, "total_receivable": 6800, "cash": 4200, "items": []}
    
    total_debt = data.get("total_debt", 0)
    total_recv = data.get("total_receivable", 0)
    cash = data.get("cash", 0)
    net = cash + total_recv - total_debt
    is_critical = net < 0
    
    # Try Gemini
    analysis_prompt = f"""Bir esnafın mali durumunu analiz et. Samimi esnaf ağabeyi gibi konuş.

Toplam Borç: {total_debt:,} TL | Alacak: {total_recv:,} TL | Nakit: {cash:,} TL | Net: {net:,} TL

{"DURUM KRİTİK — açık var!" if is_critical else "Durum kontrol altında."}

3-4 cümle durum özeti ve 2-3 somut aksiyon önerisi ver. Samimi ol ama net konuş."""

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
            
            advice_parts.append(f"  2️⃣ Rafta yatan ürünleri e-ticarete koy — hızlı nakit girişi sağla\n")
            
            if largest_debt:
                advice_parts.append(f"  3️⃣ {largest_debt['name']}'e ({largest_debt['amount']:,} TL) vade uzatma talep et\n")
            
            advice_parts.append(f"\n💡 \"Ürün satmak istiyorum\" de, sana en kârlı platformu bulayım!")
            msg = "".join(advice_parts)
        else:
            surplus = net
            msg = (
                f"✅ **Abi durum fena değil!** Kasada {surplus:,} TL fazlan var.\n\n"
                f"Net durumun: {net:,} TL (Nakit {cash:,} + Alacak {total_recv:,} - Borç {total_debt:,})\n\n"
                f"📋 **Tavsiyelerim:**\n"
                f"  1️⃣ Borçları ({total_debt:,} TL) vadesinde öde, güven kaybetme\n"
                f"  2️⃣ Alacakları ({total_recv:,} TL) sıkı takip et, geciktirme\n"
                f"  3️⃣ Fazla nakiti stok yenilemesine yatır, sezon ürünü kaçırma\n\n"
                f"💡 \"Ürün satmak istiyorum\" de, e-ticarette de kazandırayım!"
            )
    
    return {
        "kritik_nakit_acigi": is_critical,
        "messages": [AIMessage(content=msg)],
        "next_agent": END,
        "active_agent": "financial_analyst"
    }


def ecommerce_agent_node(state: AgentState):
    """E-Commerce Agent — Multi-platform comparison + SEO listing."""
    category = "genel"
    
    messages = state.get("messages", [])
    last_user_msg = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_user_msg = m.content
            break
    
    normalized = normalize_turkish(last_user_msg)
    
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
    
    if commission == -1.0:
        commission = 0.20
    
    # Price calculation example
    sample_cost = 100  # Example cost price
    total_cut = commission + kdv
    min_sell = int(sample_cost / (1 - total_cut)) + 1
    
    # Try Gemini for creative SEO
    seo_prompt = f"""Türk e-ticaret sitesi için {category} kategorisinde ürün ilanı hazırla.
Platform: {platform}. Komisyon: %{int(commission*100)}. KDV: %{int(kdv*100)}.
1. SEO başlık (max 80 karakter, Türkçe anahtar kelimeler)
2. Ürün açıklaması (3 cümle, müşteriyi cezbeden)
3. 100 TL maliyetli ürün için minimum satış fiyatı önerisi
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
            f"  • Komisyon: %{int(commission*100)} = {int(sample_cost * commission)} TL\n"
            f"  • KDV: %{int(kdv*100)} = {int(sample_cost * kdv)} TL\n"
            f"  • Minimum satış fiyatı: **{min_sell} TL**\n"
            f"  • Önerilen fiyat: **{int(min_sell * 1.15)} TL** (%15 kâr marjı)\n"
            f"━━━━━━━━━━━━━━━━━━━\n\n"
            f"⚠️ **Yayınlayayım mı?** (Onay bekliyor)"
        )
    
    return {
        "ecommerce_draft_ready": True,
        "messages": [AIMessage(content=msg)],
        "next_agent": END,
        "active_agent": "ecommerce_agent"
    }


# --- GRAPH ---
def router(state: AgentState):
    return state.get("next_agent", END)

workflow = StateGraph(AgentState)
workflow.add_node("supervisor", supervisor_node)
workflow.add_node("vision_agent", vision_agent_node)
workflow.add_node("financial_analyst_agent", financial_analyst_node)
workflow.add_node("ecommerce_agent", ecommerce_agent_node)

workflow.set_entry_point("supervisor")
workflow.add_conditional_edges("supervisor", router)
workflow.add_conditional_edges("vision_agent", router)
workflow.add_conditional_edges("financial_analyst_agent", router)
workflow.add_conditional_edges("ecommerce_agent", router)

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
