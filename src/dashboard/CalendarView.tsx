import { useMemo, useState } from "react";
import { useEvents, useSubjects, useTasks } from "../data/store";
import "./CalendarView.css";

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

export function CalendarView() {
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
        color: subj?.color ?? "#666",
        kind: e.type,
      });
    }
    for (const t of tasks) {
      if (!t.dueDate) continue;
      if (t.status === "done") continue;
      const subj = subjectMap.get(t.subjectId);
      push(new Date(t.dueDate), {
        id: `t-${t.id}`,
        title: t.title,
        color: subj?.color ?? "#666",
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

  const renderCell = (day: Date) => {
    const items = itemsByDay.get(day.toDateString()) ?? [];
    const isOther = mode === "month" && day.getMonth() !== cursor.getMonth();
    const isToday = sameDay(day, today);
    return (
      <div
        key={day.toISOString()}
        className={`cal__cell ${isOther ? "is-other" : ""} ${isToday ? "is-today" : ""}`}
      >
        <div className="cal__cell-head">
          <span className="cal__cell-day">{day.getDate()}</span>
          {isToday && <span className="cal__today-pill">today</span>}
        </div>
        <ul className="cal__items">
          {items.slice(0, mode === "month" ? 3 : 8).map((it) => (
            <li
              key={it.id}
              className={`cal__item cal__item--${it.kind}`}
              style={{ borderLeftColor: it.color }}
              title={it.title}
            >
              <span className="cal__item-title">{it.title}</span>
            </li>
          ))}
          {items.length > (mode === "month" ? 3 : 8) && (
            <li className="cal__more">
              + {items.length - (mode === "month" ? 3 : 8)} more
            </li>
          )}
        </ul>
      </div>
    );
  };

  const totalItems = events.length + tasks.filter((t) => t.dueDate).length;

  return (
    <>
      <header className="view-head">
        <div className="view-head__left">
          <span className="view-sub">Calendar</span>
          <h1 className="view-title">{titleLabel}</h1>
        </div>
        <div className="view-right">
          <div className="cal__modes">
            <button
              className={`cal__mode ${mode === "week" ? "is-active" : ""}`}
              onClick={() => setMode("week")}
            >
              Week
            </button>
            <button
              className={`cal__mode ${mode === "month" ? "is-active" : ""}`}
              onClick={() => setMode("month")}
            >
              Month
            </button>
          </div>
          <button className="ghost" onClick={() => move(-1)} title="Previous">
            ←
          </button>
          <button className="ghost" onClick={jumpToday}>
            Today
          </button>
          <button className="ghost" onClick={() => move(1)} title="Next">
            →
          </button>
        </div>
      </header>

      {totalItems === 0 && (
        <div className="empty">
          <p className="empty__title">Nothing on the calendar yet.</p>
          <p>
            Upload syllabi during onboarding, add tasks in the Tasks view, or
            ask the planner to create something.
          </p>
        </div>
      )}

      <section className="card cal">
        <div className="cal__weekdays">
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal__weekday">
              {w}
            </div>
          ))}
        </div>
        <div className={`cal__grid cal__grid--${mode}`}>
          {(mode === "month" ? monthGrid : weekGrid).map(renderCell)}
        </div>
      </section>
    </>
  );
}
