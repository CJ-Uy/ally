import { useEffect, useRef, useState } from "react";
import { refreshAll } from "../data/store";

interface PlannerTurn {
  role: "user" | "model";
  text: string;
}

interface AskAllyProps {
  open: boolean;
  onClose: () => void;
}

const STARTERS = [
  "What should I work on next?",
  "Show me everything due this week.",
  "Add a study session for tomorrow afternoon.",
];

export function AskAlly({ open, onClose }: AskAllyProps) {
  const [history, setHistory] = useState<PlannerTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !window.api?.plannerHistory) return;
    void window.api.plannerHistory().then(setHistory);
  }, [open]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, sending]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending || !window.api?.plannerChat) return;
    setInput("");
    setHistory((h) => [...h, { role: "user", text: trimmed }]);
    setSending(true);
    try {
      const reply = await window.api.plannerChat(trimmed);
      setHistory((h) => [...h, { role: "model", text: reply.visibleText }]);
      refreshAll();
    } catch (err) {
      setHistory((h) => [
        ...h,
        {
          role: "model",
          text: err instanceof Error ? `Something broke: ${err.message}` : "Something broke.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const reset = async () => {
    if (!window.api?.plannerReset) return;
    await window.api.plannerReset();
    setHistory([]);
  };

  if (!open) return null;

  return (
    <div className="ask-ally-overlay" role="dialog" aria-label="Ask Ally chat">
      <div className="planner-chat ask-ally-popup">
        <div className="planner-chat__header">
          <img src="/ally.png" alt="Ally" className="planner-chat__avatar" />
          <div className="planner-chat__title">
            <div className="planner-chat__title-main">Ask Ally</div>
            <div className="planner-chat__title-sub">Study planner</div>
          </div>
          <div className="planner-chat__actions">
            {history.length > 0 && (
              <button type="button" className="btn btn--sm" onClick={() => void reset()}>
                New
              </button>
            )}
            <button
              type="button"
              className="btn btn--sm planner-chat__close"
              onClick={onClose}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>
        </div>

        <div className="planner-chat__scroll" ref={scrollerRef}>
          {history.length === 0 && !sending && (
            <div className="planner-chat__empty">
              <p className="planner-chat__empty-title">Ask for what you'd ask a TA.</p>
              <p className="planner-chat__empty-sub">
                Ally has the tools to read and rewrite your plan.
              </p>
              <div className="planner-chat__starters">
                {STARTERS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className="planner-chat__starter"
                    onClick={() => void send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {history.map((t, i) => (
            <div key={i} className={`planner-msg planner-msg--${t.role}`}>
              <div className="planner-msg__bubble">{t.text}</div>
            </div>
          ))}
          {sending && (
            <div className="planner-msg planner-msg--model">
              <div className="planner-msg__bubble planner-msg__bubble--typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          )}
        </div>

        <form
          className="planner-chat__composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <input
            ref={inputRef}
            placeholder="What can I help you plan?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            className="btn btn--primary btn--sm"
            disabled={sending || !input.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
