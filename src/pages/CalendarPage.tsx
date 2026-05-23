const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CalEvent = { type: "task" | "exam"; label: string; color: string };
const CAL_EVENTS: Record<string, CalEvent[]> = {
  "0,2": [{ type: "task", label: "LinAlg Ch.3 problems", color: "sky" }],
  "0,4": [{ type: "task", label: "Read History M2", color: "butter" }],
  "1,0": [{ type: "task", label: "Spanish vocab", color: "blush" }],
  "1,2": [{ type: "task", label: "LinAlg Ch.4 practice", color: "sky" }],
  "1,3": [{ type: "task", label: "Essay outline", color: "sage" }],
  "1,4": [{ type: "task", label: "History M3", color: "butter" }],
  "2,1": [{ type: "task", label: "LinAlg review", color: "sky" }],
  "2,3": [{ type: "exam", label: "Linear Algebra exam", color: "fox" }],
  "3,0": [{ type: "task", label: "Spanish quiz prep", color: "blush" }],
  "3,2": [{ type: "exam", label: "Spanish quiz", color: "fox" }],
  "3,4": [{ type: "task", label: "Essay draft 1", color: "sage" }],
  "4,1": [{ type: "task", label: "Essay revision", color: "sage" }],
  "4,4": [{ type: "exam", label: "History essay due", color: "fox" }],
};

const COLOR_MAP: Record<string, string> = {
  sky:    "var(--sky)",
  sage:   "var(--sage)",
  butter: "var(--butter)",
  blush:  "var(--blush)",
  fox:    "var(--fox)",
};

export function CalendarPage() {
  const TODAY_KEY = "1,2";

  return (
    <div className="page-calendar">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Your weeks · May 2026</div>
          <h2 className="page-title">The next month, mapped out.</h2>
        </div>
        <div className="page-header-actions">
          <button className="btn cal-nav-btn" type="button">‹</button>
          <span className="cal-month-label">May 2026</span>
          <button className="btn cal-nav-btn" type="button">›</button>
          <button className="btn btn--primary" type="button">+ Add task</button>
        </div>
      </div>

      {/* Legend */}
      <div className="cal-legend">
        {[
          ["sky",    "LinAlg"],
          ["butter", "History"],
          ["blush",  "Spanish"],
          ["sage",   "Essay"],
          ["fox",    "Deadline"],
        ].map(([c, label]) => (
          <span key={c} className="cal-legend-item">
            <span className="cal-legend-dot" style={{ background: COLOR_MAP[c] }} />
            {label}
          </span>
        ))}
      </div>

      {/* Day headers */}
      <div className="cal-grid-head">
        {DAYS.map(d => <div key={d} className="cal-day-head">{d.toUpperCase()}</div>)}
      </div>

      {/* Day cells */}
      <div className="cal-grid">
        {Array.from({ length: 35 }).map((_, idx) => {
          const wk  = Math.floor(idx / 7);
          const day = idx % 7;
          const dayNum = idx - 3 + 1;
          const displayNum = dayNum < 1 ? 27 + dayNum + 4 : ((dayNum - 1) % 31) + 1;
          const key   = `${wk},${day}`;
          const events = CAL_EVENTS[key] ?? [];
          const isToday = key === TODAY_KEY;
          const otherMonth = dayNum < 1 || dayNum > 31;

          return (
            <div
              key={idx}
              className={`cal-cell${isToday ? " cal-cell--today" : ""}${otherMonth ? " cal-cell--other" : ""}`}
            >
              <div className="cal-cell-num">
                {displayNum}
                {isToday && <span className="cal-today-label">TODAY</span>}
              </div>
              <div className="cal-events">
                {events.map((e, i) => (
                  <div
                    key={i}
                    className={`cal-event${e.type === "exam" ? " cal-event--exam" : ""}`}
                    style={{ background: COLOR_MAP[e.color] }}
                  >
                    {e.type === "exam" && "⚑ "}{e.label}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
