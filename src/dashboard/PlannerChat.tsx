import { useEffect, useRef, useState } from "react";
import { refreshAll } from "../data/store";
import "./PlannerChat.css";

interface Turn {
  role: "user" | "model";
  text: string;
}

const STARTERS = [
  "What should I work on next?",
  "Add a study session for tomorrow afternoon.",
  "Show me everything due this week.",
  "Mark my reading task as done.",
];

export function PlannerChat() {
  const [history, setHistory] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void window.api.plannerHistory().then((h) => setHistory(h));
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, sending]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
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
          text:
            err instanceof Error
              ? `Something broke: ${err.message}`
              : "Something broke.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const reset = async () => {
    await window.api.plannerReset();
    setHistory([]);
  };

  return (
    <>
      <header className="view-head">
        <div className="view-head__left">
          <span className="view-sub">Study Planner</span>
          <h1 className="view-title">Tell Ally what you need.</h1>
        </div>
        <div className="view-right">
          {history.length > 0 && (
            <button className="ghost" onClick={reset}>
              New conversation
            </button>
          )}
        </div>
      </header>

      <section className="planner card">
        <div className="planner__scroll" ref={scrollerRef}>
          {history.length === 0 && !sending && (
            <div className="planner__empty">
              <p className="planner__empty-title">
                Ask for what you'd ask a TA.
              </p>
              <p className="planner__empty-sub">
                Ally has the tools to read and rewrite your plan.
              </p>
              <div className="planner__starters">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    className="ghost planner__starter"
                    onClick={() => send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.map((t, i) => (
            <article
              key={i}
              className={`planner__turn planner__turn--${t.role}`}
            >
              <span className="planner__who">
                {t.role === "user" ? "You" : "Ally"}
              </span>
              <div className="planner__bubble">{t.text}</div>
            </article>
          ))}
          {sending && (
            <article className="planner__turn planner__turn--model">
              <span className="planner__who">Ally</span>
              <div className="planner__bubble planner__typing">
                <span /> <span /> <span />
              </div>
            </article>
          )}
        </div>

        <form
          className="planner__input"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <input
            placeholder="What can I help you plan?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            autoFocus
          />
          <button
            type="submit"
            className="accent"
            disabled={sending || !input.trim()}
          >
            Send
          </button>
        </form>
      </section>
    </>
  );
}
