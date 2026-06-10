"use client";
import { useState, useRef, useEffect } from "react";
import Navbar from "../components/Navbar";
import MarkdownRenderer from "../components/MarkdownRenderer";

type Message = {
  id: number;
  role: "user" | "supervisor" | "system";
  content: string;
  isActionable?: boolean;
  isCritical?: boolean;
  agent?: string;
  time: string;
  imagePreview?: string;
  thoughtProcess?: string[];
};

type AlertItem = { type: string; msg: string };

const AGENT_BADGES: Record<string, { icon: string; label: string; color: string }> = {
  supervisor: { icon: "🧠", label: "Supervisor", color: "bg-emerald-700" },
  vision_agent: { icon: "🔍", label: "Vision", color: "bg-blue-700" },
  financial_analyst: { icon: "📊", label: "Finans", color: "bg-amber-700" },
  ecommerce_agent: { icon: "🛒", label: "E-Ticaret", color: "bg-purple-700" },
  inventory_agent: { icon: "📦", label: "Envanter", color: "bg-teal-700" },
  neighborhood_agent: { icon: "📡", label: "Mahalle Radarı", color: "bg-rose-700" },
};

const QUICK_ACTIONS = [
  { icon: "📷", label: "Defter Fotoğrafı", msg: "Defterin fotoğrafına bak", isPhotoUpload: true },
  { icon: "📊", label: "Mali Durumum", msg: "Durumum nedir, borçlarıma bak" },
  { icon: "🛒", label: "Ürün Sat", msg: "Trendyol'da şampuan satmak istiyorum" },
  { icon: "📦", label: "Stok Kontrol", msg: "Stoktaki ürünleri listele" },
  { icon: "📡", label: "Mahalle Radarı", msg: "Mahalledeki piyasa durumuna bak" },
  { icon: "💰", label: "Vergi Hesapla", msg: "Vergi durumumu hesapla" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1, role: "supervisor",
      content: "Hayırlı işler abi! 🤝 Ben Esnaf.AI — senin dijital iş ortağın.\n\nDefterin fotoğrafını çek, mali durumunu sor, stokunu kontrol et veya ürün satışı için yardım iste.\n\nNe yapalım?",
      agent: "supervisor",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSendPhotoRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [backendOnline, setBackendOnline] = useState(true);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Fetch alerts on load
  useEffect(() => {
    fetch("/api/alerts")
      .then(r => r.json())
      .then(d => { if (d.alerts?.length) { setAlerts(d.alerts); setShowAlerts(true); } })
      .catch(() => {});
  }, []);

  // Sunucu online kontrolü (Health Check)
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setBackendOnline(false);
      controller.abort();
    }, 5000);

    fetch("/api/health", { signal: controller.signal })
      .then(r => {
        clearTimeout(timeout);
        if (!r.ok) throw new Error();
        setBackendOnline(true);
      })
      .catch(() => {
        clearTimeout(timeout);
        setBackendOnline(false);
      });
  }, []);

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    if (isLoading) return;
    if (action.isPhotoUpload) {
      autoSendPhotoRef.current = true;
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: "supervisor",
        content: "📷 Defterinin, fişinin veya faturanın fotoğrafını seç abi. Ben hemen okuyup borç-alacak tablosunu çıkarayım!",
        agent: "supervisor",
        time: now(),
      }]);
      fileInputRef.current?.click();
      return;
    }

    setShowQuickActions(false);
    void handleSendDirect(action.msg);
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: "system",
        content: "🛑 İşlem kullanıcı tarafından iptal edildi.",
        time: now(),
      }]);
    }
  };

  const parseStreamChunk = (line: string) => {
    if (!line.startsWith("data: ") || line.length <= 6) return null;
    try {
      const data = JSON.parse(line.slice(6));
      return data.content ? data : null;
    } catch {
      return null;
    }
  };

  const consumeStream = async (res: Response) => {
    if (!res.ok) {
      throw new Error(`Sunucu hatası (${res.status})`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("Sunucu yanıt vermedi");

    const decoder = new TextDecoder();
    let buffer = "";
    let received = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const data = parseStreamChunk(line);
        if (data) {
          received = true;
          addAgentMessage(data);
        }
      }
    }

    if (!received) {
      throw new Error("Sunucudan yanıt alınamadı");
    }
  };

  const handleSendDirect = async (directText?: string) => {
    const text = (directText || input).trim();
    if (!text && !selectedImage) return;
    if (isLoading) return;
    setShowQuickActions(false);

    const userMsg: Message = {
      id: Date.now(), role: "user", content: text || "📷 Fotoğraf gönderildi",
      time: now(),
      imagePreview: imagePreviewUrl || undefined,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      if (selectedImage) {
        const formData = new FormData();
        formData.append("message", text || "Bu defterin fotoğrafını analiz et");
        formData.append("image", selectedImage);
        const res = await fetch("/stream", { method: "POST", body: formData, signal: controller.signal });
        await consumeStream(res);
      } else {
        const res = await fetch(`/stream?message=${encodeURIComponent(text)}`, { signal: controller.signal });
        await consumeStream(res);
      }
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: "system",
        content: isTimeout
          ? "⏱️ Sunucu 30 saniye içinde yanıt vermedi. Backend açık mı kontrol et veya tekrar dene."
          : "⚠️ Sunucuya bağlanılamadı. Backend çalışıyor mu kontrol et (uvicorn main:app --port 8000).",
        time: now(),
      }]);
      setBackendOnline(false);
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await handleSendDirect();
  };

  const addAgentMessage = (data: { node: string; agent?: string; content: string; is_actionable?: boolean; is_critical?: boolean; thought_process?: string[] }) => {
    const agentKey = data.agent || data.node;
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      role: data.node === "supervisor" ? "supervisor" : "system",
      content: data.content, agent: agentKey,
      isActionable: data.is_actionable, isCritical: data.is_critical,
      thoughtProcess: data.thought_process,
      time: now(),
    }]);
  };

  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const executeAction = async (action: string) => {
    setIsLoading(true);
    // Disable previous action buttons
    setMessages(prev => prev.map(m => ({ ...m, isActionable: false })));
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, agent: "ecommerce_agent" }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ") && line.length > 6) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) addAgentMessage(data);
              } catch { /* skip */ }
            }
          }
        }
      }
    } catch {
      setMessages(prev => [...prev, { id: Date.now(), role: "system", content: "⚠️ İşlem hatası: Sunucuya ulaşılamadı.", time: now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionApprove = () => executeAction("approve");
  const handleActionReject = () => executeAction("reject");


  const sendWithImage = async (file: File, text: string, previewUrl: string) => {
    if (isLoading) return;
    setShowQuickActions(false);

    const userMsg: Message = {
      id: Date.now(), role: "user", content: text || "📷 Fotoğraf gönderildi",
      time: now(),
      imagePreview: previewUrl,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const formData = new FormData();
      formData.append("message", text || "Bu defterin fotoğrafını analiz et");
      formData.append("image", file);
      const res = await fetch("/stream", { method: "POST", body: formData, signal: controller.signal });
      await consumeStream(res);
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: "system",
        content: isTimeout
          ? "⏱️ Sunucu 30 saniye içinde yanıt vermedi. Tekrar dene veya backend'i kontrol et."
          : "⚠️ Sunucuya bağlanılamadı. Backend çalışıyor mu kontrol et.",
        time: now(),
      }]);
      setBackendOnline(false);
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      autoSendPhotoRef.current = false;
      return;
    }
    loadImageFile(file);
  };

  const loadImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const previewUrl = ev.target?.result as string;
      setSelectedImage(file);
      setImagePreviewUrl(previewUrl);

      if (autoSendPhotoRef.current) {
        autoSendPhotoRef.current = false;
        setSelectedImage(null);
        setImagePreviewUrl(null);
        void sendWithImage(file, "Bu defterin fotoğrafını analiz et", previewUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) loadImageFile(file);
  };

  const startListening = () => {
    // @ts-expect-error Web Speech API
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Tarayıcınız sesli komutu desteklemiyor. Chrome kullanın."); return; }
    const rec = new SR();
    rec.lang = "tr-TR"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e: { results: { 0: { 0: { transcript: string } } } }) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => {
        const newText = prev + (prev ? " " : "") + transcript;
        return newText;
      });
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
  };

  return (
    <main className="flex h-screen w-full flex-col bg-[#0b141a] font-sans text-neutral-100 overflow-hidden">
      {/* Header */}
      <header className="flex h-16 items-center justify-between bg-[#202c33] px-4 shadow-sm z-10 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/30">
            <span className="text-xl font-black text-white">E</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight tracking-tight">Esnaf<span className="gradient-text">.AI</span></h1>
            <p className={`text-xs font-medium ${isLoading ? "text-yellow-400" : backendOnline ? "text-emerald-400" : "text-red-400"}`}>
              {isLoading ? "⏳ düşünüyor..." : backendOnline ? "● çevrimiçi" : "● bağlantı yok"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Alert bell */}
          {alerts.length > 0 && (
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
            >
              <span className="text-lg">🔔</span>
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">{alerts.length}</span>
            </button>
          )}
          <button onClick={() => setShowStats(!showStats)} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-[#aebac1] hover:bg-white/10 transition-colors font-medium" title="Konuşma İstatistikleri">📈 {messages.length - 1}</button>
          <a href="/dashboard" className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors font-medium">📊 Dashboard</a>
          <button onClick={() => fetch("/reset", { method: "POST" }).then(() => { setMessages([messages[0]]); setShowQuickActions(true); })} className="text-xs px-3 py-1.5 rounded-lg border border-[#8696a0]/30 text-[#8696a0] hover:bg-white/5 transition-colors">Sıfırla</button>
        </div>
      </header>

      {/* Alert Banner */}
      {showAlerts && alerts.length > 0 && (
        <div className="bg-[#182229] border-b border-white/5 px-4 py-2 flex flex-col gap-1 max-h-32 overflow-y-auto" style={{ animation: "slideDown 0.3s ease" }}>
          {alerts.slice(0, 4).map((a, i) => (
            <div key={i} className={`text-xs px-3 py-1.5 rounded-lg ${a.type === "critical" ? "bg-red-900/30 text-red-300" : a.type === "warning" ? "bg-amber-900/30 text-amber-300" : "bg-blue-900/30 text-blue-300"}`}>
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* Conversation Stats */}
      {showStats && (
        <div className="bg-[#182229] border-b border-white/5 px-4 py-3" style={{ animation: "slideDown 0.3s ease" }}>
          <div className="mx-auto max-w-3xl grid grid-cols-4 gap-3">
            {(() => {
              const userMsgs = messages.filter(m => m.role === "user").length;
              const aiMsgs = messages.filter(m => m.role !== "user").length;
              const agentTypes = new Set(messages.filter(m => m.agent && m.agent !== "supervisor").map(m => m.agent));
              const thoughtSteps = messages.reduce((acc, m) => acc + (m.thoughtProcess?.length || 0), 0);
              return (
                <>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-emerald-400">{userMsgs}</div>
                    <div className="text-[9px] text-[#8696a0]">Mesajlarınız</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-blue-400">{aiMsgs}</div>
                    <div className="text-[9px] text-[#8696a0]">AI Yanıtları</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-purple-400">{agentTypes.size}</div>
                    <div className="text-[9px] text-[#8696a0]">Ajan Devrede</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-amber-400">{thoughtSteps}</div>
                    <div className="text-[9px] text-[#8696a0]">Düşünce Adımı</div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div
        className={`flex-1 overflow-y-auto p-4 sm:p-6 pb-28 bg-[#0b141a] transition-colors ${isDragging ? "ring-2 ring-inset ring-emerald-500 bg-emerald-950/20" : ""}`}
        style={{ backgroundImage: "radial-gradient(#202c33 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-none">
            <div className="glass rounded-2xl px-12 py-8 text-center border-2 border-dashed border-emerald-400">
              <p className="text-3xl mb-2">📷</p>
              <p className="text-emerald-400 font-semibold">Fotoğrafı buraya bırak abi!</p>
            </div>
          </div>
        )}
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          <div className="mx-auto bg-[#182229] px-3 py-1 rounded-lg text-xs text-[#aebac1] mb-2 shadow-sm">BUGÜN</div>

          {messages.map((msg, idx) => (
            <div key={msg.id} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`} style={{ animation: `${msg.role === "user" ? "slideInRight" : "slideInLeft"} 0.3s ease ${idx > 1 ? "0s" : `${idx * 0.1}s`} both` }}>
              {msg.role === "system" && !msg.agent ? (
                <div className={`mx-auto my-1 rounded-lg px-4 py-1.5 text-[11px] text-center max-w-[80%] ${msg.isCritical ? "bg-red-900/40 text-red-300 border border-red-800" : "bg-[#182229] text-[#aebac1]"}`}>⚡ {msg.content}</div>
              ) : (
                <div className={`relative flex max-w-[85%] flex-col rounded-xl px-3 pt-2 pb-1.5 sm:max-w-[75%] shadow-lg ${
                  msg.role === "user" ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none"
                  : msg.isCritical ? "bg-red-950/60 text-[#e9edef] rounded-tl-none border border-red-800/50"
                  : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                }`}>
                  <div className="px-0.5">
                    {/* Agent Badge */}
                    {msg.agent && msg.role !== "user" && AGENT_BADGES[msg.agent] && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1.5 ${AGENT_BADGES[msg.agent].color} text-white shadow-sm`}>
                        {AGENT_BADGES[msg.agent].icon} {AGENT_BADGES[msg.agent].label}
                      </span>
                    )}
                    {msg.imagePreview && (
                      <img src={msg.imagePreview} alt="Yüklenen görsel" className="rounded-lg max-h-48 w-full object-cover mb-2 shadow-sm" />
                    )}
                    
                    {/* Thought Process Steps */}
                    {msg.thoughtProcess && msg.thoughtProcess.length > 0 && (
                      <div className="mb-3 space-y-1.5">
                        {msg.thoughtProcess.map((step, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px] text-[#aebac1] bg-black/20 rounded-md px-2 py-1.5 border border-white/5" style={{ animation: `fadeIn 0.3s ease ${i * 0.15}s both` }}>
                            <span className="text-emerald-500 mt-0.5">✓</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {msg.role === "user" ? (
                      <p className="text-[14.5px] leading-snug whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}

                    {/* Human-in-the-loop Buttons */}
                    {msg.isActionable && (
                      <div className="mt-3 mb-1 flex gap-2">
                        <button onClick={handleActionApprove} className="flex-1 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 py-2 text-sm font-bold text-white hover:from-emerald-500 hover:to-emerald-400 active:scale-95 transition-all shadow-md">✅ İlanı Yayınla</button>
                        <button onClick={handleActionReject} className="rounded-lg border border-[#8696a0]/40 bg-transparent px-4 py-2 text-sm font-medium text-[#8696a0] hover:bg-white/5 active:scale-95 transition-all">❌ İptal</button>
                      </div>
                    )}
                  </div>
                  {/* Time + Read Receipt */}
                  <div className="flex items-center justify-end gap-1 mt-0.5 px-0.5">
                    <span className="text-[10px] text-[#8696a0]">{msg.time}</span>
                    {msg.role === "user" && (
                      <svg viewBox="0 0 16 15" width="16" height="15" className="text-[#53bdeb]" fill="currentColor">
                        <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex justify-start" style={{ animation: "fadeIn 0.3s ease" }}>
              <div className="bg-[#202c33] rounded-xl rounded-tl-none px-5 py-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full" style={{ animation: "typing-dot 1.4s infinite 0ms" }} />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full" style={{ animation: "typing-dot 1.4s infinite 200ms" }} />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full" style={{ animation: "typing-dot 1.4s infinite 400ms" }} />
                  </div>
                  <button onClick={handleCancel} className="text-[10px] text-red-400 hover:text-red-300 px-2 py-0.5 rounded-md border border-red-800/40 hover:bg-red-900/20 transition-colors">İptal</button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Action Chips */}
          {showQuickActions && messages.length <= 2 && !isLoading && (
            <div className="flex flex-col items-center gap-3 mt-3" style={{ animation: "slideUp 0.5s ease 0.3s both" }}>
              {!backendOnline && (
                <div className="text-xs text-amber-400 bg-amber-900/20 border border-amber-800/30 rounded-lg px-4 py-2 text-center max-w-md">
                  ⚠️ Sunucuya bağlanılamıyor. Komutlar çalışmayabilir. Backend&apos;in açık olduğundan emin ol.
                </div>
              )}
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_ACTIONS.map(a => (
                  <button key={a.label} onClick={() => handleQuickAction(a)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass text-sm text-[#e9edef] hover:bg-white/10 hover:scale-105 transition-all duration-200 active:scale-95">
                    <span>{a.icon}</span> {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Voice Listening Overlay */}
      {isListening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-300">
          <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center w-32 h-32 mb-6">
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-30"></div>
              <div className="absolute inset-2 bg-red-500 rounded-full animate-pulse opacity-50"></div>
              <div className="relative z-10 w-20 h-20 bg-gradient-to-tr from-red-600 to-red-400 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.6)]">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="white"><path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.349 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H3.761c0 4.001 3.178 7.297 7.061 7.885v3.884h2.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-2.002z" /></svg>
              </div>
            </div>
            <p className="text-2xl font-semibold text-white tracking-wide animate-pulse">Dinliyorum...</p>
            <p className="text-[#aebac1] mt-2 text-sm max-w-xs text-center">Esnaf.AI seni dinliyor. Konuşman bittiğinde söylediklerin mesaj kutusuna eklenecek.</p>
            <button onClick={() => setIsListening(false)} className="mt-8 px-6 py-2 rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors">
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {imagePreviewUrl && (
        <div className="bg-[#111b21] border-t border-white/5 px-4 py-2 flex items-center gap-3" style={{ animation: "slideUp 0.2s ease" }}>
          <img src={imagePreviewUrl} alt="Seçilen" className="h-16 w-16 object-cover rounded-lg border border-emerald-600 shadow-md" />
          <span className="text-sm text-[#aebac1] flex-1 truncate">{selectedImage?.name}</span>
          <button onClick={() => { setSelectedImage(null); setImagePreviewUrl(null); }} className="text-red-400 hover:text-red-300 text-sm font-medium px-2 py-1 rounded-lg hover:bg-red-900/20 transition-colors">✕ Kaldır</button>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-[#202c33] p-2 sm:p-3 z-10 border-t border-white/5">
        <div className="mx-auto max-w-3xl flex items-end gap-2">
          <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileSelect} />
          <button onClick={() => fileInputRef.current?.click()} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl text-[#8696a0] hover:bg-white/5 hover:text-emerald-400 transition-all" title="Fotoğraf Yükle">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M1.816 15.556v.002c0 1.502.584 2.912 1.646 3.972s2.472 1.647 3.974 1.647a5.58 5.58 0 0 0 3.972-1.645l9.547-9.548c.769-.768 1.147-1.767 1.058-2.817-.079-.968-.548-1.927-1.319-2.698-1.594-1.592-4.068-1.711-5.517-.262l-7.916 7.915c-.881.881-.792 2.25.214 3.261.959.958 2.423 1.053 3.263.215l5.511-5.512c.28-.28.267-.722.053-.936l-.244-.244c-.191-.191-.567-.349-.957.04l-5.506 5.506c-.18.18-.635.127-.976-.214-.098-.097-.576-.613-.213-.973l7.915-7.917c.818-.817 2.267-.699 3.23.262.5.501.802 1.1.849 1.685.051.573-.156 1.111-.589 1.543l-9.547 9.549a3.97 3.97 0 0 1-2.829 1.171 3.975 3.975 0 0 1-2.83-1.171 3.973 3.973 0 0 1-1.172-2.828c0-1.071.415-2.076 1.172-2.83l7.209-7.211c.157-.157.264-.579.028-.814L11.5 4.36a.606.606 0 0 0-.86.024l-7.21 7.21a5.577 5.577 0 0 0-1.614 3.962z" /></svg>
          </button>

          <form onSubmit={handleSend} className="flex flex-1 items-end rounded-xl bg-[#2a3942] pl-4 pr-1 py-1 shadow-sm border border-transparent focus-within:border-emerald-700/50 transition-colors">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Bir mesaj yazın..." disabled={isLoading} className="min-h-[40px] w-full bg-transparent px-1 pb-1 pt-2.5 text-[15px] text-[#e9edef] placeholder-[#8696a0] outline-none disabled:opacity-50" />
          </form>

          {input.trim() || selectedImage ? (
            <button type="button" onClick={() => handleSend()} disabled={isLoading} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/30 active:scale-95">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" /></svg>
            </button>
          ) : (
            <button type="button" onClick={startListening} className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl transition-all shadow-lg active:scale-95 ${isListening ? "bg-red-500 animate-pulse shadow-red-900/30" : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-900/30"} text-white`}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.349 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H3.761c0 4.001 3.178 7.297 7.061 7.885v3.884h2.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-2.002z" /></svg>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
