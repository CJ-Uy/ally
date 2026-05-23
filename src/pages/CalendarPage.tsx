import { useEffect, useMemo, useRef, useState } from "react";
import { refreshAll, useEvents, useSubjects, useTasks } from "../data/store";

type Mode = "month" | "week";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(d.getDate() + n);
  return x;
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setDate(d.getDate() - d.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

interface CellItem {
  id: string;
  title: string;
  color: string;
  kind: "task" | "exam" | "class" | "deadline" | "study_block";
}

interface PlannerTurn {
  role: "user" | "model";
  text: string;
}

function PlannerChatPanel({ onClose }: { onClose: () => void }) {
  const [history, setHistory] = useState<PlannerTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.api?.plannerHistory) return;
    void window.api.plannerHistory().then(setHistory);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, sending]);

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

  const STARTERS = [
    "What should I work on next?",
    "Show me everything due this week.",
    "Add a study session for tomorrow afternoon.",
  ];

  return (
    <div className="planner-chat">
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
          <button type="button" className="btn btn--sm planner-chat__close" onClick={onClose}>
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
              <span className="dot" /><span className="dot" /><span className="dot" />
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
          placeholder="What can I help you plan?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button type="submit" className="btn btn--primary btn--sm" disabled={sending || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export function CalendarPage() {
  const [events] = useEvents();
  const [tasks] = useTasks();
  const [subjects] = useSubjects();
  const [cursor, setCursor] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [mode, setMode] = useState<Mode>("month");
  const [chatOpen, setChatOpen] = useState(false);

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s] as const)),
    [subjects],
  );

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CellItem[]>();
    const push = (date: Date, item: CellItem) => {
      const k = date.toDateString();
      const arr = map.get(k) ?? [];
      arr.push(item);
      map.set(k, arr);
    };
    for (const e of events) {
      const subj = subjectMap.get(e.subjectId);
      push(new Date(e.startsAt), {
        id: `e-${e.id}`,
        title: e.title,
        color: subj?.color ?? "var(--accent)",
        kind: e.type,
      });
    }
    for (const t of tasks) {
      if (!t.dueDate || t.status === "done") continue;
      const subj = subjectMap.get(t.subjectId);
      push(new Date(t.dueDate), {
        id: `t-${t.id}`,
        title: t.title,
        color: subj?.color ?? "var(--accent)",
        kind: "task",
      });
    }
    return map;
  }, [events, tasks, subjectMap]);

  const monthGrid = useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    const startPad = first.getDay();
    const totalCells = Math.ceil((startPad + last.getDate()) / 7) * 7;
    const start = addDays(first, -startPad);
    return Array.from({ length: totalCells }, (_, i) => addDays(start, i));
  }, [cursor]);

  const weekGrid = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const titleLabel = useMemo(() => {
    if (mode === "month") {
      return cursor.toLocaleDateString([], { month: "long", year: "numeric" });
    }
    const start = startOfWeek(cursor);
    const end = addDays(start, 6);
    return `${start.toLocaleDateString([], { month: "short", day: "numeric" })} – ${end.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
  }, [cursor, mode]);

  const move = (dir: -1 | 1) => {
    setCursor((c) => {
      if (mode === "month") {
        return new Date(c.getFullYear(), c.getMonth() + dir, 1);
      }
      return addDays(c, dir * 7);
    });
  };
  const jumpToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCursor(d);
  };

  const totalItems = events.length + tasks.filter((t) => t.dueDate && t.status !== "done").length;

  const renderCell = (day: Date) => {
    const items = itemsByDay.get(day.toDateString()) ?? [];
    const isOther = mode === "month" && day.getMonth() !== cursor.getMonth();
    const isToday = sameDay(day, today);
    const maxItems = mode === "month" ? 3 : 8;

    return (
      <div
        key={day.toISOString()}
        className={`cal-cell${isOther ? " cal-cell--other" : ""}${isToday ? " cal-cell--today" : ""}`}
      >
        <div className="cal-cell-num">
          {day.getDate()}
          {isToday && <span className="cal-today-label">TODAY</span>}
        </div>
        <div className="cal-events">
          {items.slice(0, maxItems).map((it) => (
            <div
              key={it.id}
              className={`cal-event cal-event--${it.kind}`}
              style={{ background: it.color }}
              title={it.title}
            >
              {it.kind === "exam" && "⚑ "}{it.title}
            </div>
          ))}
          {items.length > maxItems && (
            <div className="cal-event-more">+ {items.length - maxItems} more</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`page-calendar${chatOpen ? " page-calendar--with-chat" : ""}`}>
      <div className="cal-main">
        <div className="page-header">
          <div>
            <div className="page-eyebrow">Your calendar</div>
            <h2 className="page-title">{titleLabel}</h2>
          </div>
          <div className="page-header-actions">
            <div className="cal-mode-toggle">
              <button
                type="button"
                className={`cal-mode${mode === "week" ? " cal-mode--active" : ""}`}
                onClick={() => setMode("week")}
              >
                Week
              </button>
              <button
                type="button"
                className={`cal-mode${mode === "month" ? " cal-mode--active" : ""}`}
                onClick={() => setMode("month")}
              >
                Month
              </button>
            </div>
            <button type="button" className="btn cal-nav-btn" onClick={() => move(-1)} title="Previous">‹</button>
            <button type="button" className="btn" onClick={jumpToday}>Today</button>
            <button type="button" className="btn cal-nav-btn" onClick={() => move(1)} title="Next">›</button>
            <button
              type="button"
              className={`btn${chatOpen ? " btn--primary" : ""}`}
              onClick={() => setChatOpen((o) => !o)}
              title="Ask Ally"
            >
              ✦ Ask Ally
            </button>
          </div>
        </div>

        {subjects.length > 0 && (
          <div className="cal-legend">
            {subjects.map((s) => (
              <span key={s.id} className="cal-legend-item">
                <span className="cal-legend-dot" style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        )}

        {totalItems === 0 ? (
          <div className="card cal-empty">
            <p className="cal-empty__title">Nothing on the calendar yet.</p>
            <p className="cal-empty__sub">
              Upload syllabi during onboarding, add tasks from the Tasks page,
              or ask Ally to plan something.
            </p>
          </div>
        ) : (
          <>
            <div className="cal-grid-head">
              {WEEKDAYS.map((d) => (
                <div key={d} className="cal-day-head">{d.toUpperCase()}</div>
              ))}
            </div>

            <div className={`cal-grid cal-grid--${mode}`}>
              {(mode === "month" ? monthGrid : weekGrid).map(renderCell)}
            </div>
          </>
        )}
      </div>

      {chatOpen && <PlannerChatPanel onClose={() => setChatOpen(false)} />}
    </div>
  );
}
