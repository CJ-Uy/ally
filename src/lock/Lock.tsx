import { useEffect, useRef, useState } from "react";

interface ChatLine {
  role: "user" | "agent";
  text: string;
}

export function Lock() {
  const [info, setInfo] = useState<LockOpenInfo | null>(null);
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const unsubscribe = window.api.onLockOpen((next) => {
      setInfo(next);
      setMessages([]);
      setInput("");
      inputRef.current?.focus();
    });
    inputRef.current?.focus();
    return unsubscribe;
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (text.length === 0 || loading) return;
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

  const close = () => {
    void window.api.lockClose();
  };

  return (
    <div className="lock">
      <header className="lock__header">
        <div className="lock__heading">
          <h1 className="lock__title">
            {info?.keyword
              ? `${info.keyword} is blocked during your study session.`
              : "This site is blocked during your study session."}
          </h1>
          <p className="lock__subtitle">
            Study session paused. Make your case to Study Guardian.
          </p>
        </div>
        <button
          type="button"
          className="lock__close"
          onClick={close}
          aria-label="Close and return to studying"
          title="Close (no break granted)"
        >
          ×
        </button>
      </header>

      <main className="lock__chat" ref={listRef}>
        {messages.length === 0 && !loading && (
          <div className="lock__empty">
            Tell the agent why you need a break. Be specific.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg msg--${m.role}`}>
            <div className="msg__bubble">{m.text}</div>
          </div>
        ))}
        {loading && (
          <div className="msg msg--agent">
            <div className="msg__bubble msg__bubble--loading">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
      </main>

      <footer className="lock__composer">
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
      </footer>
    </div>
  );
}
