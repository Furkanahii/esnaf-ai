"use client";
import { useState, useRef, useEffect } from "react";

type Message = {
  id: number;
  role: "user" | "supervisor" | "system";
  content: string;
  isActionable?: boolean;
  isCritical?: boolean;
  agent?: string;
  time: string;
  imagePreview?: string;
};

const AGENT_BADGES: Record<string, { icon: string; label: string; color: string }> = {
  supervisor: { icon: "🧠", label: "Supervisor", color: "bg-emerald-700" },
  vision_agent: { icon: "🔍", label: "Vision", color: "bg-blue-700" },
  financial_analyst: { icon: "📊", label: "Finans", color: "bg-amber-700" },
  ecommerce_agent: { icon: "🛒", label: "E-Ticaret", color: "bg-purple-700" },
};

const QUICK_ACTIONS = [
  { icon: "📷", label: "Defter Fotoğrafı Çek", msg: "Defterin fotoğrafına bak" },
  { icon: "📊", label: "Mali Durumum", msg: "Durumum nedir, borçlarıma bak" },
  { icon: "🛒", label: "Ürün Sat", msg: "Trendyol'da şampuan satmak istiyorum" },
  { icon: "💰", label: "Vergi Hesapla", msg: "Vergi durumumu hesapla" },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "supervisor", content: "Hayırlı işler abi! Ben Esnaf.AI. Defterin fotoğrafını çek, durumunu sor veya ürün satışı için yardım iste.", agent: "supervisor", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
  ]);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleQuickAction = (msg: string) => {
    setShowQuickActions(false);
    setInput(msg);
    setTimeout(() => { setInput(""); handleSendDirect(msg); }, 50);
  };

  const handleSendDirect = async (directText?: string) => {
    const text = (directText || input).trim();
    if (!text && !selectedImage) return;
    if (isLoading) return;
    setShowQuickActions(false);

    const userMsg: Message = {
      id: Date.now(), role: "user", content: text || "📷 Fotoğraf gönderildi",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      imagePreview: imagePreviewUrl || undefined,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      if (selectedImage) {
        // POST with image
        const formData = new FormData();
        formData.append("message", text || "Bu defterin fotoğrafını analiz et");
        formData.append("image", selectedImage);
        setSelectedImage(null);
        setImagePreviewUrl(null);

        const res = await fetch("http://localhost:8000/stream", { method: "POST", body: formData });
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
      } else {
        // GET text only
        const es = new EventSource(`http://localhost:8000/stream?message=${encodeURIComponent(text)}`);
        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.content) addAgentMessage(data);
          } catch { /* skip */ }
        };
        es.addEventListener("end", () => es.close());
        es.onerror = () => {
          es.close();
          setMessages(prev => [...prev, { id: Date.now(), role: "system", content: "⚠️ Bağlantı hatası: Backend yanıt vermiyor.", time: now() }]);
        };
        // Wait for stream to end
        await new Promise<void>(resolve => {
          es.addEventListener("end", () => resolve());
          es.onerror = () => { es.close(); resolve(); };
        });
      }
    } catch {
      setMessages(prev => [...prev, { id: Date.now(), role: "system", content: "⚠️ Sunucuya bağlanılamadı.", time: now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await handleSendDirect();
  };

  const addAgentMessage = (data: { node: string; agent?: string; content: string; is_actionable?: boolean; is_critical?: boolean }) => {
    const agentKey = data.agent || data.node;
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      role: data.node === "supervisor" ? "supervisor" : "system",
      content: data.content, agent: agentKey,
      isActionable: data.is_actionable, isCritical: data.is_critical,
      time: now(),
    }]);
  };

  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleActionApprove = () => {
    setMessages(prev => [...prev,
      { id: Date.now(), role: "system", content: "✅ Onay alındı. İlan yayına alınıyor...", time: now() },
      { id: Date.now() + 1, role: "supervisor", content: "Tamamdır abi! İlanı SEO uyumlu başlıkla yayına aldım. Siftah bizden bereketi Allah'tan! 🤲", agent: "supervisor", time: now() },
    ]);
  };

  const handleActionReject = () => {
    setMessages(prev => [...prev,
      { id: Date.now(), role: "supervisor", content: "Tamam abi, ilanı iptal ettim. Başka bir şey yapmamı ister misin?", agent: "supervisor", time: now() },
    ]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadImageFile(file);
  };

  const loadImageFile = (file: File) => {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreviewUrl(ev.target?.result as string);
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
    // @ts-expect-error Event
    rec.onresult = (e: { results: { 0: { 0: { transcript: string } } } }) => setInput(prev => prev + (prev ? " " : "") + e.results[0][0].transcript);
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
  };

  return (
    <main className="flex h-screen w-full flex-col bg-[#0b141a] font-sans text-neutral-100 overflow-hidden">
      {/* Header */}
      <header className="flex h-16 items-center justify-between bg-[#202c33] px-4 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 shadow-lg">
            <span className="text-xl font-bold text-white">E</span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-white leading-tight">Esnaf.AI</h1>
            <p className={`text-xs font-medium ${isLoading ? "text-yellow-400" : "text-emerald-400"}`}>
              {isLoading ? "düşünüyor..." : "çevrimiçi"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[#aebac1]">
          <button onClick={() => fetch("http://localhost:8000/reset", { method: "POST" }).then(() => setMessages([messages[0]]))} className="text-xs px-2 py-1 rounded border border-[#8696a0] hover:bg-[#111b21] transition-colors">Sıfırla</button>
        </div>
      </header>

      {/* Chat */}
      <div
        className={`flex-1 overflow-y-auto p-4 sm:p-6 pb-28 bg-[#0b141a] transition-colors ${isDragging ? "ring-2 ring-inset ring-emerald-500 bg-emerald-950/20" : ""}`}
        style={{ backgroundImage: "radial-gradient(#202c33 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-none">
            <div className="bg-[#202c33] border-2 border-dashed border-emerald-400 rounded-2xl px-12 py-8 text-center">
              <p className="text-3xl mb-2">📷</p>
              <p className="text-emerald-400 font-semibold">Fotoğrafı buraya bırak abi!</p>
            </div>
          </div>
        )}
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          <div className="mx-auto bg-[#182229] px-3 py-1 rounded-lg text-xs text-[#aebac1] mb-2 shadow-sm">BUGÜN</div>

          {messages.map(msg => (
            <div key={msg.id} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"} animate-[fadeIn_0.2s_ease]`}>
              {msg.role === "system" && !msg.agent ? (
                <div className={`mx-auto my-1 rounded-lg px-4 py-1.5 text-[11px] text-center max-w-[80%] ${msg.isCritical ? "bg-red-900/40 text-red-300 border border-red-800" : "bg-[#182229] text-[#aebac1]"}`}>⚡ {msg.content}</div>
              ) : (
                <div className={`relative flex max-w-[85%] flex-col rounded-lg px-2 pt-2 pb-1 sm:max-w-[75%] shadow-md ${
                  msg.role === "user" ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none"
                  : msg.isCritical ? "bg-red-950/60 text-[#e9edef] rounded-tl-none border border-red-800/50"
                  : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                }`}>
                  {/* Tail */}
                  <span className={`absolute top-0 ${msg.role === "user" ? "-right-2 text-[#005c4b]" : "-left-2 text-[#202c33]"}`}>
                    <svg viewBox="0 0 8 13" width="8" height="13" fill="currentColor">
                      {msg.role === "user" ? <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" /> : <path d="M1.533 3.568L8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z" />}
                    </svg>
                  </span>

                  <div className="px-1">
                    {/* Agent Badge */}
                    {msg.agent && msg.role !== "user" && AGENT_BADGES[msg.agent] && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full mb-1 ${AGENT_BADGES[msg.agent].color} text-white`}>
                        {AGENT_BADGES[msg.agent].icon} {AGENT_BADGES[msg.agent].label}
                      </span>
                    )}
                    {/* Image Preview */}
                    {msg.imagePreview && (
                      <img src={msg.imagePreview} alt="Yüklenen görsel" className="rounded-md max-h-48 w-full object-cover mb-2" />
                    )}
                    <p className="text-[14.5px] leading-snug whitespace-pre-wrap">{msg.content}</p>

                    {/* Human-in-the-loop Buttons */}
                    {msg.isActionable && (
                      <div className="mt-3 mb-1 flex gap-2">
                        <button onClick={handleActionApprove} className="flex-1 rounded-md bg-[#00a884] py-2 text-sm font-semibold text-neutral-900 hover:bg-[#008f6f] active:scale-95 transition-all">✅ İlanı Yayınla</button>
                        <button onClick={handleActionReject} className="rounded-md border border-[#8696a0] bg-transparent px-3 py-2 text-sm font-medium text-[#8696a0] hover:bg-[#111b21] active:scale-95">❌ İptal</button>
                      </div>
                    )}
                  </div>
                  {/* Time + Read Receipt */}
                  <div className="flex items-center justify-end gap-1 mt-0.5 px-1">
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
            <div className="flex justify-start">
              <div className="bg-[#202c33] rounded-lg rounded-tl-none px-4 py-3 shadow-md">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          {/* Quick Action Chips */}
          {showQuickActions && messages.length <= 2 && !isLoading && (
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {QUICK_ACTIONS.map(a => (
                <button key={a.label} onClick={() => handleQuickAction(a.msg)} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#202c33] border border-[#2a3942] text-sm text-[#e9edef] hover:bg-[#2a3942] hover:border-emerald-700 transition-all active:scale-95">
                  <span>{a.icon}</span> {a.label}
                </button>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Image Preview Bar */}
      {imagePreviewUrl && (
        <div className="bg-[#111b21] border-t border-[#2a3942] px-4 py-2 flex items-center gap-3">
          <img src={imagePreviewUrl} alt="Seçilen" className="h-16 w-16 object-cover rounded-lg border border-emerald-600" />
          <span className="text-sm text-[#aebac1] flex-1">{selectedImage?.name}</span>
          <button onClick={() => { setSelectedImage(null); setImagePreviewUrl(null); }} className="text-red-400 hover:text-red-300 text-sm font-medium">Kaldır ✕</button>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-[#202c33] p-2 sm:p-3 z-10 border-t border-[#2a3942]">
        <div className="mx-auto max-w-3xl flex items-end gap-2">
          <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileSelect} />
          <button onClick={() => fileInputRef.current?.click()} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-[#8696a0] hover:bg-[#111b21] hover:text-emerald-400 transition-colors" title="Fotoğraf Yükle">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M1.816 15.556v.002c0 1.502.584 2.912 1.646 3.972s2.472 1.647 3.974 1.647a5.58 5.58 0 0 0 3.972-1.645l9.547-9.548c.769-.768 1.147-1.767 1.058-2.817-.079-.968-.548-1.927-1.319-2.698-1.594-1.592-4.068-1.711-5.517-.262l-7.916 7.915c-.881.881-.792 2.25.214 3.261.959.958 2.423 1.053 3.263.215l5.511-5.512c.28-.28.267-.722.053-.936l-.244-.244c-.191-.191-.567-.349-.957.04l-5.506 5.506c-.18.18-.635.127-.976-.214-.098-.097-.576-.613-.213-.973l7.915-7.917c.818-.817 2.267-.699 3.23.262.5.501.802 1.1.849 1.685.051.573-.156 1.111-.589 1.543l-9.547 9.549a3.97 3.97 0 0 1-2.829 1.171 3.975 3.975 0 0 1-2.83-1.171 3.973 3.973 0 0 1-1.172-2.828c0-1.071.415-2.076 1.172-2.83l7.209-7.211c.157-.157.264-.579.028-.814L11.5 4.36a.606.606 0 0 0-.86.024l-7.21 7.21a5.577 5.577 0 0 0-1.614 3.962z" /></svg>
          </button>

          <form onSubmit={handleSend} className="flex flex-1 items-end rounded-xl bg-[#2a3942] pl-3 pr-1 py-1 shadow-sm">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Bir mesaj yazın" disabled={isLoading} className="min-h-[40px] w-full bg-transparent px-1 pb-1 pt-2.5 text-[15px] text-[#e9edef] placeholder-[#8696a0] outline-none disabled:opacity-50" />
          </form>

          {input.trim() || selectedImage ? (
            <button type="button" onClick={() => handleSend()} disabled={isLoading} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white hover:bg-[#008f6f] transition-colors disabled:opacity-50">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" /></svg>
            </button>
          ) : (
            <button type="button" onClick={startListening} className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full transition-colors ${isListening ? "bg-red-500 animate-pulse" : "bg-[#00a884] hover:bg-[#008f6f]"} text-white`}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.349 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H3.761c0 4.001 3.178 7.297 7.061 7.885v3.884h2.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-2.002z" /></svg>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
