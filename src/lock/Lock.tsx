import { useEffect, useRef, useState } from "react";

interface ChatLine {
  role: "user" | "agent";
  text: string;
}

function StopSign() {
  return (
    <svg viewBox="0 0 60 60" className="lock__stop" aria-hidden>
      <polygon
        points="20,4 40,4 56,20 56,40 40,56 20,56 4,40 4,20"
        fill="#D9534F"
        stroke="#fff"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <text
        x="30" y="35"
        textAnchor="middle"
        fontFamily="'Bricolage Grotesque', system-ui, sans-serif"
        fontWeight="800"
        fontSize="13"
        fill="#fff"
        letterSpacing="0.5"
      >
        STOP
      </text>
    </svg>
  );
}

export function Lock() {
  const [info, setInfo]       = useState<LockOpenInfo | null>(null);
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [granted, setGranted] = useState(false);
  const countdown = "04:32";
  const listRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!window.api?.onLockOpen) return;
    const unsub = window.api.onLockOpen((next) => {
      setInfo(next);
      setMessages([]);
      setInput("");
      inputRef.current?.focus();
    });
    inputRef.current?.focus();
    return unsub;
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading || !window.api?.chatSend) {
      // Demo: grant break on any message when no real API
      if (text && !window.api?.chatSend) {
        setMessages(prev => [...prev, { role: "user", text }, { role: "agent", text: "Okay — 5 minutes. Go stretch. I'll bring you back." }]);
        setInput("");
        setGranted(true);
      }
      return;
    }
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const reply = await window.api.chatSend(text);
      setMessages((prev) => [...prev, { role: "agent", text: reply.visibleText }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: "Agent unavailable, try again." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const close = () => void window.api?.lockClose?.();

  const keyword = info?.keyword ?? "This site";

  if (granted) {
    return (
      <div className="lock lock--granted">
        <div className="lock__statusbar">
          <span className="lock__sticker lock__sticker--granted">✓ Granted</span>
          <span className="lock__sticker lock__sticker--paused">break · 5 min</span>
        </div>

        <div className="lock__scene lock__scene--granted">
          <div className="lock__ally-col">
            <div className="lock__ally-wrap">
              <img src="/ally.png" alt="Ally" className="lock__ally-img" />
            </div>
            <div className="lock__ally-label">Ally · study guardian</div>
          </div>

          <div className="lock__chat-col">
            <div className="lock__bubble lock__bubble--granted">
              <p className="lock__bubble-headline">5 minutes. Go stretch.</p>
              <p className="lock__bubble-sub">I'll let you know when it's time to come back.</p>
              <svg width={80} height={8} viewBox="0 0 80 8" style={{ marginTop: 8 }}>
                <path d="M2 5 Q 10 1, 20 4 T 40 4 T 60 4 T 78 4"
                  stroke="var(--sage)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </svg>
            </div>

            <div className="lock__countdown-wrap">
              <div className="lock__countdown">{countdown}</div>
              <div className="lock__countdown-label">remaining</div>
            </div>

            <button type="button" className="btn btn--primary" onClick={() => { setGranted(false); close(); }}>
              I'm back →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lock">
      <div className="lock__statusbar">
        <span className="lock__sticker lock__sticker--blocked">● {keyword} blocked</span>
        <span className="lock__sticker lock__sticker--paused">session paused</span>
      </div>

      <button type="button" className="lock__close" onClick={close} aria-label="Close — no break granted">
        ×
      </button>

      <div className="lock__scene">
        {/* Left — Ally + STOP sign */}
        <div className="lock__ally-col">
          <div className="lock__ally-wrap">
            <img src="/ally.png" alt="Ally" className="lock__ally-img" />
            <StopSign />
          </div>
          <div className="lock__ally-label">Ally · study guardian</div>
        </div>

        {/* Right — speech bubble + chat + composer */}
        <div className="lock__chat-col">
          <div className="lock__bubble">
            <p className="lock__bubble-headline">
              {keyword} is blocked during your study session.
            </p>
            <p className="lock__bubble-sub">
              Talk to me — if you've got a real reason, I'll grant a break.
            </p>
          </div>

          <div className="lock__messages" ref={listRef}>
            {messages.length === 0 && !loading && (
              <div className="lock__empty">Make your case below.</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`msg msg--${m.role}`}>
                <div className="msg__bubble">{m.text}</div>
              </div>
            ))}
            {loading && (
              <div className="msg msg--agent">
                <div className="msg__bubble msg__bubble--loading">
                  <span className="dot" /><span className="dot" /><span className="dot" />
                </div>
              </div>
            )}
          </div>

          <div className="lock__composer">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Make your case…"
              rows={2}
              disabled={loading}
            />
            <button
              type="button"
              className="lock__send"
              onClick={() => void send()}
              disabled={loading || input.trim().length === 0}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
