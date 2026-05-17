"""
Esnaf.AI — FastAPI Backend v4.0 with SSE Streaming, Dashboard & Alerts
"""
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import json
import asyncio
import base64
from typing import Optional
from dotenv import load_dotenv

from agent import app_graph, AgentState, build_proactive_alerts, get_inventory_data, compare_all_platforms, get_neighborhood_trends
from langchain_core.messages import HumanMessage

load_dotenv()

app = FastAPI(title="Esnaf.AI API", version="4.0.0")

# CORS — Allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory state (per-session for hackathon)
conversation_history: list = []
last_financial_data: dict = {
    "total_debt": 25550, "total_receivable": 21800, "cash": 2200,
    "items": [
        {"name": "Toptancı Ahmet Abi", "amount": 12500, "type": "borc", "date": "05.05.2026", "instrument_type": "acik_hesap", "risk_score": 0},
        {"name": "Tuhafiyeci Veli", "amount": 8750, "type": "borc", "date": "08.05.2026", "instrument_type": "acik_hesap", "risk_score": 0},
        {"name": "Bakkal Mehmet", "amount": 3200, "type": "alacak", "date": "10.05.2026", "instrument_type": "acik_hesap", "risk_score": 85},
        {"name": "Terzi Fatma Hanım", "amount": 1500, "type": "alacak", "date": "12.05.2026", "instrument_type": "acik_hesap", "risk_score": 20},
        {"name": "Kasap İbrahim", "amount": 4300, "type": "borc", "date": "03.05.2026", "instrument_type": "cek", "risk_score": 0},
        {"name": "Manav Hüseyin", "amount": 2100, "type": "alacak", "date": "14.05.2026", "instrument_type": "acik_hesap", "risk_score": 40},
        {"name": "Tedarikçi Cemal", "amount": 15000, "type": "alacak", "date": "30.06.2026", "instrument_type": "senet", "risk_score": 10},
    ],
    "assets": [
        {"name": "Kurye Motoru", "value": 65000, "monthly_depreciation": 2500},
        {"name": "Soğutucu Dolap", "value": 30000, "monthly_depreciation": 800}
    ]
}


@app.get("/")
def read_root():
    return {"status": "online", "app": "Esnaf.AI", "version": "4.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/dashboard")
def get_dashboard():
    """Dashboard data — financial summary + inventory summary."""
    inv = get_inventory_data()
    net = last_financial_data["cash"] + last_financial_data["total_receivable"] - last_financial_data["total_debt"]
    return {
        "financial": {
            "total_debt": last_financial_data["total_debt"],
            "total_receivable": last_financial_data["total_receivable"],
            "cash": last_financial_data["cash"],
            "net": net,
            "is_critical": net < 0,
            "items": last_financial_data["items"],
            "assets": last_financial_data.get("assets", []),
        },
        "inventory": inv.get("summary", {}),
        "store_name": inv.get("store_name", "Esnaf Dükkanı"),
    }


@app.get("/api/alerts")
def get_alerts():
    """Proactive alerts — stock, deadlines, financial."""
    alerts = build_proactive_alerts(last_financial_data)
    net = last_financial_data["cash"] + last_financial_data["total_receivable"] - last_financial_data["total_debt"]
    if net < 0:
        alerts.insert(0, {"type": "critical", "msg": f"🚨 Kasada {abs(net):,} TL açık var!"})
    return {"alerts": alerts}


@app.get("/api/radar")
def get_radar():
    """Neighborhood trends data for Mahalle Radarı."""
    return get_neighborhood_trends()


@app.get("/api/platforms")
def get_platforms():
    """Platform comparison data for dashboard charts."""
    categories = ["kozmetik", "elektronik", "giyim", "gıda", "ev_yasam"]
    try:
        with open(os.path.join(os.path.dirname(__file__), "data", "commission_rates.json"), "r") as f:
            all_rates = json.load(f)
        result = {}
        for cat in categories:
            result[cat] = {}
            for platform, rates in all_rates.items():
                if cat in rates:
                    result[cat][platform] = rates[cat]
        return {"categories": result, "platforms": list(all_rates.keys())}
    except:
        return {"categories": {}, "platforms": []}


async def generate_graph_stream(message: str, image_b64: Optional[str] = None):
    """Stream LangGraph agent outputs as SSE events."""
    global conversation_history, last_financial_data
    
    conversation_history.append(HumanMessage(content=message))
    
    initial_state: AgentState = {
        "messages": list(conversation_history),
        "image_b64": image_b64,
        "kritik_nakit_acigi": False,
        "extracted_financial_data": last_financial_data,
        "ecommerce_draft_ready": False,
        "next_agent": "",
        "active_agent": "",
        "proactive_alerts": None,
    }
    
    for output in app_graph.stream(initial_state):
        for node_name, node_state in output.items():
            msgs = node_state.get("messages", [])
            last_msg = msgs[-1].content if msgs else ""
            active = node_state.get("active_agent", node_name)
            
            if not last_msg:
                continue
            
            # Update financial data if vision agent extracted it
            if node_state.get("extracted_financial_data"):
                last_financial_data = node_state["extracted_financial_data"]
            
            conversation_history.append(msgs[-1])
            
            payload = {
                "node": node_name,
                "agent": active,
                "content": last_msg,
                "is_actionable": node_state.get("ecommerce_draft_ready", False),
                "is_critical": node_state.get("kritik_nakit_acigi", False),
                "alerts": node_state.get("proactive_alerts", []),
            }
            yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
            await asyncio.sleep(1.5)
    
    yield "event: end\ndata: {}\n\n"


@app.get("/stream")
async def stream_agent_get(message: str):
    return StreamingResponse(
        generate_graph_stream(message),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/stream")
async def stream_agent_post(
    message: str = Form(...),
    image: Optional[UploadFile] = File(None),
):
    image_b64 = None
    if image:
        contents = await image.read()
        image_b64 = base64.b64encode(contents).decode("utf-8")
    
    return StreamingResponse(
        generate_graph_stream(message, image_b64),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/reset")
def reset_conversation():
    global conversation_history
    conversation_history = []
    return {"status": "reset", "message": "Konuşma geçmişi temizlendi."}


class ActionRequest(BaseModel):
    action: str
    agent: str

async def generate_action_stream(action: str, agent: str):
    global conversation_history
    if action == "approve":
        msg = "✅ İlanı Yayınla işlemi onaylandı."
        agent_reply = "Tamamdır abi! İlanı SEO uyumlu başlıkla yayına aldım. Siftah bizden bereketi Allah'tan! 🤲"
    else:
        msg = "❌ İlan işlemi iptal edildi."
        agent_reply = "Tamam abi, ilanı iptal ettim. Başka bir şey yapmamı ister misin?"
        
    conversation_history.append(HumanMessage(content=msg))
    
    # Send user action message back to UI
    yield f"data: {json.dumps({'node': 'system', 'content': msg, 'is_actionable': False}, ensure_ascii=False)}\n\n"
    await asyncio.sleep(1)
    
    # Send agent response
    yield f"data: {json.dumps({'node': 'supervisor', 'agent': 'supervisor', 'content': agent_reply, 'is_actionable': False}, ensure_ascii=False)}\n\n"
    await asyncio.sleep(0.5)
    
    yield "event: end\ndata: {}\n\n"

@app.post("/api/action")
async def process_action(req: ActionRequest):
    return StreamingResponse(
        generate_action_stream(req.action, req.agent),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

