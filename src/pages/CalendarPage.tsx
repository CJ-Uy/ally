import { useMemo, useState } from "react";
import { useEvents, useSubjects, useTasks } from "../data/store";

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
    <div className="page-calendar">
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

    </div>
  );
}
