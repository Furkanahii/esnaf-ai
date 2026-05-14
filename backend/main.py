"""
Esnaf.AI — FastAPI Backend with SSE Streaming & Image Upload
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

from agent import app_graph, AgentState
from langchain_core.messages import HumanMessage

load_dotenv()

app = FastAPI(title="Esnaf.AI API", version="2.0.0")

# CORS — Allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory conversation history (per-session for hackathon)
conversation_history: list = []


@app.get("/")
def read_root():
    return {"status": "online", "app": "Esnaf.AI", "version": "2.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


async def generate_graph_stream(message: str, image_b64: Optional[str] = None):
    """Stream LangGraph agent outputs as SSE events."""
    global conversation_history
    
    # Build state with conversation memory
    conversation_history.append(HumanMessage(content=message))
    
    initial_state: AgentState = {
        "messages": list(conversation_history),
        "image_b64": image_b64,
        "kritik_nakit_acigi": False,
        "extracted_financial_data": None,
        "ecommerce_draft_ready": False,
        "next_agent": "",
        "active_agent": "",
    }
    
    for output in app_graph.stream(initial_state):
        for node_name, node_state in output.items():
            msgs = node_state.get("messages", [])
            last_msg = msgs[-1].content if msgs else ""
            active = node_state.get("active_agent", node_name)
            
            if not last_msg:
                continue
            
            # Add to conversation history
            conversation_history.append(msgs[-1])
            
            payload = {
                "node": node_name,
                "agent": active,
                "content": last_msg,
                "is_actionable": node_state.get("ecommerce_draft_ready", False),
                "is_critical": node_state.get("kritik_nakit_acigi", False),
            }
            yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
            await asyncio.sleep(2.0)  # Dramatic pause for hackathon showmanship
    
    yield "event: end\ndata: {}\n\n"


# GET endpoint (text only — backward compatible)
@app.get("/stream")
async def stream_agent_get(message: str):
    return StreamingResponse(
        generate_graph_stream(message),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# POST endpoint (text + image upload)
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


# Reset conversation
@app.post("/reset")
def reset_conversation():
    global conversation_history
    conversation_history = []
    return {"status": "reset", "message": "Konuşma geçmişi temizlendi."}
