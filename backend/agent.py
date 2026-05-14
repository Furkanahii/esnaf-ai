"""
Esnaf.AI — LangGraph Supervisor Agent with Real Gemini Integration
Hackathon-ready: Works with real Gemini API or falls back to smart mock.
"""
import os
import json
import base64
from typing import TypedDict, Annotated, Sequence, Optional
import operator
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from dotenv import load_dotenv

load_dotenv()

# --- Gemini Client Setup ---
gemini_model = None
gemini_vision_model = None

try:
    import google.generativeai as genai
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if api_key and not api_key.startswith("mock"):
        genai.configure(api_key=api_key)
        gemini_model = genai.GenerativeModel("gemini-1.5-flash")
        gemini_vision_model = genai.GenerativeModel("gemini-1.5-flash")
        print("✅ Gemini API aktif — Gerçek AI modu")
    else:
        print("⚠️ Gemini API key bulunamadı — Akıllı Mock modu")
except ImportError:
    print("⚠️ google-generativeai yüklü değil — Akıllı Mock modu")


# --- 1. STATE DEFINITION ---
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    image_b64: Optional[str]           # Base64 encoded image from user
    kritik_nakit_acigi: bool
    extracted_financial_data: Optional[dict]
    ecommerce_draft_ready: bool
    next_agent: str
    active_agent: str                  # For UI badge display


# --- 2. HELPER: Gemini Call with Fallback ---
def call_gemini(prompt: str, image_b64: str = None) -> str:
    """Call Gemini API. Falls back to mock if unavailable."""
    if gemini_model and not image_b64:
        try:
            resp = gemini_model.generate_content(prompt)
            return resp.text
        except Exception as e:
            print(f"Gemini API error: {e}")
            return None
    
    if gemini_vision_model and image_b64:
        try:
            image_data = base64.b64decode(image_b64)
            resp = gemini_vision_model.generate_content([
                prompt,
                {"mime_type": "image/jpeg", "data": image_data}
            ])
            return resp.text
        except Exception as e:
            print(f"Gemini Vision API error: {e}")
            return None
    
    return None  # Trigger mock fallback


# --- 3. HYBRID RAG TOOLS ---
def get_commission_rate(platform: str, category: str) -> float:
    """Fetch exact commission rates from structured DB (no hallucination)."""
    try:
        with open(os.path.join(os.path.dirname(__file__), "data", "commission_rates.json"), "r") as f:
            rates = json.load(f)
        platform_rates = rates.get(platform.lower(), {})
        if category.lower() in platform_rates:
            return platform_rates[category.lower()]
        return -1.0  # Not found flag
    except (FileNotFoundError, json.JSONDecodeError):
        return -1.0


def get_tax_info(business_type: str) -> dict:
    """Fetch tax rules from structured DB."""
    try:
        with open(os.path.join(os.path.dirname(__file__), "data", "tax_rules.json"), "r") as f:
            rules = json.load(f)
        return rules.get(business_type.lower(), rules.get("default", {}))
    except (FileNotFoundError, json.JSONDecodeError):
        return {"kdv": 0.20, "note": "Vergi bilgisi bulunamadı, varsayılan %20 KDV uygulandı."}


# --- 4. AGENT NODES ---

def supervisor_node(state: AgentState):
    """
    Baş Orkestratör — Durumu değerlendirir, işi uzman ajana devreder.
    Kişilik: Samimi esnaf ağabeyi ("Abi", "Hayırlı işler").
    """
    messages = state.get("messages", [])
    last_msg = messages[-1].content if messages else ""
    has_image = bool(state.get("image_b64"))
    
    # Try Gemini for intelligent routing
    routing_prompt = f"""Sen Esnaf.AI'ın yönlendirici ajanısın. Kullanıcı mesajını analiz et ve hangi uzman ajana yönlendirilmesi gerektiğini belirle.

Uzman Ajanlar:
- vision_agent: Kullanıcı fotoğraf/görsel yüklediyse veya defter/fiş/fatura ile ilgili görsel analiz gerekiyorsa
- financial_analyst_agent: Mali durum, borç, alacak, nakit akışı sorguları
- ecommerce_agent: Ürün satma, e-ticaret, ilan açma, fiyatlandırma istekleri

Kullanıcı mesajı: "{last_msg}"
Görsel yüklendi mi: {"Evet" if has_image else "Hayır"}

SADECE şu formatla yanıt ver (başka hiçbir şey yazma):
ROUTE: [ajan_adı]
RESPONSE: [Esnaf ağabeyi gibi samimi kısa yanıt]"""

    gemini_result = call_gemini(routing_prompt)
    
    if gemini_result and "ROUTE:" in gemini_result:
        lines = gemini_result.strip().split("\n")
        route_line = [l for l in lines if l.startswith("ROUTE:")][0]
        resp_line = [l for l in lines if l.startswith("RESPONSE:")][0] if any(l.startswith("RESPONSE:") for l in lines) else None
        
        next_node = route_line.replace("ROUTE:", "").strip()
        response_text = resp_line.replace("RESPONSE:", "").strip() if resp_line else "Hemen bakıyorum abi..."
        
        if next_node not in ["vision_agent", "financial_analyst_agent", "ecommerce_agent"]:
            next_node = END
            response_text = response_text or "Hayırlı işler abi! Ne yapmamı istersin?"
    else:
        # Rule-based fallback routing
        next_node = END
        response_text = ""
        
        if has_image or "fotoğraf" in last_msg.lower() or "defter" in last_msg.lower() or "fiş" in last_msg.lower():
            next_node = "vision_agent"
            response_text = "Abi fotoğrafı aldım, veresiye defterini hemen inceliyorum..."
        elif any(w in last_msg.lower() for w in ["durum", "borç", "alacak", "nakit", "kasa", "hesap"]):
            next_node = "financial_analyst_agent"
            response_text = "Hemen hesaplara bakıyorum abi, bekle..."
        elif any(w in last_msg.lower() for w in ["sat", "ilan", "trendyol", "e-ticaret", "fiyat"]):
            next_node = "ecommerce_agent"
            response_text = "Hemen Trendyol'a koyalım abi, detayları hazırlıyorum..."
        else:
            response_text = "Hayırlı işler abi! Defter fotoğrafı çekebilir, durumunu sorabilir veya ürün satışı için yardım isteyebilirsin."

    return {
        "messages": [AIMessage(content=response_text)],
        "next_agent": next_node,
        "active_agent": "supervisor"
    }


def vision_agent_node(state: AgentState):
    """Görsel analiz — Defter/fiş/fatura fotoğrafını JSON veriye çevirir."""
    image_b64 = state.get("image_b64")
    
    vision_prompt = """Bu bir Türk esnafının veresiye defteri, fişi veya faturasının fotoğrafı.
Görseldeki TÜM finansal verileri çıkar ve SADECE şu JSON formatında yanıt ver:
{
  "items": [
    {"name": "Kişi/Firma adı", "amount": sayısal_tutar, "type": "borc|alacak", "date": "tarih_varsa"}
  ],
  "total_debt": toplam_borc_tutari,
  "total_receivable": toplam_alacak_tutari,
  "cash": tahmini_nakit_durum,
  "notes": "ek_notlar"
}
Eğer görseli okuyamıyorsan en iyi tahmini yap. SADECE JSON döndür."""

    extracted_data = None
    
    if image_b64:
        gemini_result = call_gemini(vision_prompt, image_b64)
        if gemini_result:
            try:
                # Clean up possible markdown formatting
                clean = gemini_result.strip()
                if clean.startswith("```"):
                    clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
                extracted_data = json.loads(clean)
            except json.JSONDecodeError:
                extracted_data = None
    
    # Smart mock fallback
    if not extracted_data:
        extracted_data = {
            "items": [
                {"name": "Rıza Baba", "amount": 3500, "type": "borc", "date": "10.05.2026"},
                {"name": "Toptancı Veli", "amount": 8000, "type": "borc", "date": "08.05.2026"},
                {"name": "Bakkal Mehmet", "amount": 1200, "type": "alacak", "date": "12.05.2026"},
                {"name": "Komşu Ayşe", "amount": 750, "type": "alacak", "date": "11.05.2026"},
            ],
            "total_debt": 11500,
            "total_receivable": 1950,
            "cash": 2000,
            "notes": "Veresiye defterinden okunan veriler"
        }

    items_text = "\n".join([
        f"  • {it['name']}: {it['amount']} TL ({it['type']})" for it in extracted_data.get("items", [])
    ])
    
    msg = f"📋 Defteri okudum abi! İşte çıkardığım veriler:\n{items_text}\n\n📊 Toplam Borç: {extracted_data.get('total_debt', 0):,} TL\n📈 Toplam Alacak: {extracted_data.get('total_receivable', 0):,} TL\n💰 Kasadaki Nakit: {extracted_data.get('cash', 0):,} TL"
    
    return {
        "extracted_financial_data": extracted_data,
        "messages": [AIMessage(content=msg)],
        "next_agent": "financial_analyst_agent",
        "active_agent": "vision_agent"
    }


def financial_analyst_node(state: AgentState):
    """Mali analiz — Nakit akışını değerlendirir ve tavsiye verir."""
    data = state.get("extracted_financial_data")
    
    if not data:
        data = {"total_debt": 5000, "total_receivable": 1000, "cash": 2000}
    
    total_debt = data.get("total_debt", 0)
    total_recv = data.get("total_receivable", 0)
    cash = data.get("cash", 0)
    net_position = cash + total_recv - total_debt
    is_critical = net_position < 0
    
    # Try Gemini for natural language analysis
    analysis_prompt = f"""Sen bir finansal danışmansın. Bir esnafın durumunu analiz et.

Veriler:
- Toplam Borç: {total_debt:,} TL
- Toplam Alacak: {total_recv:,} TL  
- Kasadaki Nakit: {cash:,} TL
- Net Durum: {net_position:,} TL

Esnaf ağabeyi gibi samimi ama net konuş. Durum kötüyse "Abi kasa kan ağlıyor" gibi ifadeler kullan.
3-4 cümle ile durum özeti ve somut tavsiye ver. Finansal jargon KULLANMA."""

    gemini_result = call_gemini(analysis_prompt)
    
    if gemini_result:
        msg = gemini_result.strip()
    else:
        if is_critical:
            deficit = abs(net_position)
            msg = (f"🚨 Abi kasa kan ağlıyor! Net durumun {net_position:,} TL, yani {deficit:,} TL açık var. "
                   f"Toptancı kapıya dayanmadan rafta yatan mallardan birini göster de hemen internete koyup eritelim. "
                   f"Ya da önce alacaklarını ({total_recv:,} TL) tahsil et, sonra borçları öde.")
        else:
            msg = (f"✅ Abi durum fena değil! Net durumun {net_position:,} TL artıda. "
                   f"Borçları ({total_debt:,} TL) zamanında ödersen sıkıntı yok. "
                   f"Alacaklarını ({total_recv:,} TL) de takipte tut, gecikmeye bırakma.")
    
    return {
        "kritik_nakit_acigi": is_critical,
        "messages": [AIMessage(content=msg)],
        "next_agent": END,
        "active_agent": "financial_analyst"
    }


def compare_all_platforms(category: str) -> str:
    """Compare commission rates across all platforms for a category."""
    try:
        with open(os.path.join(os.path.dirname(__file__), "data", "commission_rates.json"), "r") as f:
            all_rates = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return ""
    
    comparisons = []
    for platform, categories in all_rates.items():
        rate = categories.get(category.lower(), -1)
        if rate > 0:
            comparisons.append((platform, rate))
    
    if not comparisons:
        return ""
    
    comparisons.sort(key=lambda x: x[1])
    best = comparisons[0]
    
    lines = ["📊 Platform Karşılaştırması:"]
    for p, r in comparisons:
        marker = " ⭐ EN UCUZ" if p == best[0] else ""
        lines.append(f"  • {p.title()}: %{int(r*100)} komisyon{marker}")
    
    return "\n".join(lines)


def ecommerce_agent_node(state: AgentState):
    """E-Ticaret Ajan — Çoklu platform karşılaştırması + SEO ilan taslağı."""
    category = "genel"
    
    messages = state.get("messages", [])
    last_user_msg = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_user_msg = m.content
            break
    
    # Detect category and platform from message
    cat_keywords = {
        "kozmetik": ["şampuan", "krem", "kozmetik", "bakım", "cilt"],
        "elektronik": ["telefon", "kablo", "şarj", "elektronik", "bilgisayar"],
        "giyim": ["tişört", "pantolon", "elbise", "giyim", "ayakkabı", "mont"],
        "gıda": ["yağ", "un", "şeker", "çay", "gıda", "yiyecek"],
    }
    for cat, keywords in cat_keywords.items():
        if any(k in last_user_msg.lower() for k in keywords):
            category = cat
            break
    
    # Detect specific platform or default to best
    platform_keywords = {"trendyol": "trendyol", "hepsiburada": "hepsiburada", "amazon": "amazon_tr", "n11": "n11", "çiçeksepeti": "ciceksepeti"}
    platform = None
    for kw, pname in platform_keywords.items():
        if kw in last_user_msg.lower():
            platform = pname
            break
    
    # Multi-platform comparison
    comparison_text = compare_all_platforms(category)
    
    # Pick best platform if none specified
    if not platform:
        try:
            with open(os.path.join(os.path.dirname(__file__), "data", "commission_rates.json"), "r") as f:
                all_rates = json.load(f)
            best = min(((p, cats.get(category.lower(), 1.0)) for p, cats in all_rates.items() if category.lower() in cats), key=lambda x: x[1], default=("trendyol", 0.20))
            platform = best[0]
        except Exception:
            platform = "trendyol"
    
    commission = get_commission_rate(platform, category)
    tax_info = get_tax_info("basit_usul")
    
    if commission == -1.0:
        commission = 0.20
        commission_note = f"'{category}' kategorisini tam çıkaramadım, ortalama %{int(commission*100)} komisyon"
    else:
        commission_note = f"{platform.title()}'da {category} kategorisi: %{int(commission*100)} komisyon"
    
    # Try Gemini for SEO description
    seo_prompt = f"""Türk e-ticaret sitesi ({platform}) için bir ürün ilanı hazırla.
Ürün kategorisi: {category}. Komisyon: %{int(commission*100)}. KDV: %{int(tax_info.get('kdv', 0.20)*100)}.
Şunları üret: 1. SEO başlık (max 80 karakter) 2. Kısa açıklama (2 cümle) 3. Fiyat önerisi.
Samimi esnaf diliyle yaz. KISA ve NET ol."""

    gemini_result = call_gemini(seo_prompt)
    
    if gemini_result:
        seo_content = gemini_result.strip()
        msg = f"🛒 İlan taslağını hazırladım abi!\n\n{comparison_text}\n\n✅ Önerim: {commission_note}\n\n{seo_content}\n\n⚠️ Yayınlayayım mı? (Onay bekliyor)"
    else:
        msg = (f"🛒 İlan taslağını hazırladım abi!\n\n"
               f"{comparison_text}\n\n"
               f"✅ Önerim: {commission_note}\n"
               f"📌 KDV: %{int(tax_info.get('kdv', 0.20)*100)}\n\n"
               f"📝 SEO Başlık: \"Süper Fırsat | Toptan {category.title()} | Hızlı Kargo\"\n"
               f"📝 Açıklama: \"Kaliteli {category} ürünü, hızlı kargo ile kapınıza gelsin.\"\n"
               f"💰 Komisyon+KDV fiyata %{int((commission + tax_info.get('kdv', 0.20))*100)} eklendi.\n\n"
               f"⚠️ Yayınlayayım mı? (Onay bekliyor)")
    
    return {
        "ecommerce_draft_ready": True,
        "messages": [AIMessage(content=msg)],
        "next_agent": END,
        "active_agent": "ecommerce_agent"
    }


# --- 5. GRAPH ROUTING ---
def router(state: AgentState):
    return state.get("next_agent", END)


# --- 6. GRAPH BUILDER ---
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


# --- 7. TEST ---
if __name__ == "__main__":
    print("=== Esnaf.AI LangGraph Test ===\n")
    initial_state = {
        "messages": [HumanMessage(content="Abi şu defterin fotoğrafına bir bak")],
        "image_b64": None,
        "kritik_nakit_acigi": False,
        "extracted_financial_data": None,
        "ecommerce_draft_ready": False,
        "next_agent": "",
        "active_agent": "",
    }
    for output in app_graph.stream(initial_state):
        for key, value in output.items():
            print(f"🔄 [{key.upper()}]:")
            msgs = value.get("messages", [])
            if msgs:
                print(f"   {msgs[-1].content[:200]}")
            print()
