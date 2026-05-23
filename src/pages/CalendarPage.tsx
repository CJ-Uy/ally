import { useMemo, useState } from "react";
import { useEvents, useSubjects, useTasks } from "../data/store";

type Mode = "month" | "week" | "day";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const HOUR_HEIGHT = 44; // px per hour in week/day views
const VISIBLE_START_HOUR = 6;
const VISIBLE_END_HOUR = 24; // exclusive
const VISIBLE_HOURS = VISIBLE_END_HOUR - VISIBLE_START_HOUR;
const POINT_BLOCK_MINUTES = 30; // synthetic height for events without endsAt

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
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function formatTimeLabel(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function formatHourTick(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

type ItemKind = "task" | "exam" | "class" | "deadline" | "study_block";

interface DateOnlyItem {
  id: string;
  title: string;
  color: string;
  kind: ItemKind;
  // For sorting/display: scheduled start if any (so month cells can prefix "9:00 ")
  scheduledAt: Date | null;
}

interface TimeBlock {
  id: string;
  title: string;
  color: string;
  kind: ItemKind;
  start: Date;
  end: Date; // synthesized for point events
  isPoint: boolean;
}

export function CalendarPage() {
  const [events] = useEvents();
  const [tasks] = useTasks();
  const [subjects] = useSubjects();
  const [cursor, setCursor] = useState<Date>(() => startOfDay(new Date()));
  const [mode, setMode] = useState<Mode>("month");

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s] as const)),
    [subjects],
  );

  // ── Month-view: items per day (date-only flavor) ────────────────────
  const itemsByDay = useMemo(() => {
    const map = new Map<string, DateOnlyItem[]>();
    const push = (date: Date, item: DateOnlyItem) => {
      const k = date.toDateString();
      const arr = map.get(k) ?? [];
      arr.push(item);
      map.set(k, arr);
    };
    for (const e of events) {
      const subj = subjectMap.get(e.subjectId);
      const start = new Date(e.startsAt);
      push(start, {
        id: `e-${e.id}`,
        title: e.title,
        color: subj?.color ?? "var(--accent)",
        kind: e.type,
        scheduledAt: e.endsAt ? start : start,
      });
    }
    for (const t of tasks) {
      if (t.status === "done") continue;
      const subj = subjectMap.get(t.subjectId);
      const color = subj?.color ?? "var(--accent)";
      if (t.scheduledStart) {
        push(new Date(t.scheduledStart), {
          id: `t-${t.id}`,
          title: t.title,
          color,
          kind: "task",
          scheduledAt: new Date(t.scheduledStart),
        });
      } else if (t.dueDate) {
        push(new Date(t.dueDate), {
          id: `t-${t.id}`,
          title: t.title,
          color,
          kind: "task",
          scheduledAt: null,
        });
      }
    }
    // Sort each day's items: time-blocked first by hour, then date-only.
    for (const [k, arr] of map) {
      arr.sort((a, b) => {
        const at = a.scheduledAt?.getTime() ?? Number.POSITIVE_INFINITY;
        const bt = b.scheduledAt?.getTime() ?? Number.POSITIVE_INFINITY;
        return at - bt;
      });
      map.set(k, arr);
    }
    return map;
  }, [events, tasks, subjectMap]);

  // ── Week/Day-view: time blocks + all-day strip per day ──────────────
  const dayData = useMemo(() => {
    type DayBucket = { blocks: TimeBlock[]; allDay: DateOnlyItem[] };
    const map = new Map<string, DayBucket>();
    const ensure = (date: Date): DayBucket => {
      const k = startOfDay(date).toDateString();
      const existing = map.get(k);
      if (existing) return existing;
      const fresh = { blocks: [], allDay: [] };
      map.set(k, fresh);
      return fresh;
    };

    for (const e of events) {
      const subj = subjectMap.get(e.subjectId);
      const color = subj?.color ?? "var(--accent)";
      const start = new Date(e.startsAt);
      const end = e.endsAt
        ? new Date(e.endsAt)
        : new Date(start.getTime() + POINT_BLOCK_MINUTES * 60_000);
      const bucket = ensure(start);
      bucket.blocks.push({
        id: `e-${e.id}`,
        title: e.title,
        color,
        kind: e.type,
        start,
        end,
        isPoint: !e.endsAt,
      });
    }

    for (const t of tasks) {
      if (t.status === "done") continue;
      const subj = subjectMap.get(t.subjectId);
      const color = subj?.color ?? "var(--accent)";
      if (t.scheduledStart && t.scheduledEnd) {
        const start = new Date(t.scheduledStart);
        const end = new Date(t.scheduledEnd);
        const bucket = ensure(start);
        bucket.blocks.push({
          id: `t-${t.id}`,
          title: t.title,
          color,
          kind: "task",
          start,
          end,
          isPoint: false,
        });
      } else if (t.dueDate) {
        const due = new Date(t.dueDate);
        const bucket = ensure(due);
        bucket.allDay.push({
          id: `t-${t.id}`,
          title: t.title,
          color,
          kind: "task",
          scheduledAt: null,
        });
      }
    }

    for (const [k, b] of map) {
      b.blocks.sort((a, c) => a.start.getTime() - c.start.getTime());
      map.set(k, b);
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

  const today = startOfDay(new Date());

  const titleLabel = useMemo(() => {
    if (mode === "month") {
      return cursor.toLocaleDateString([], { month: "long", year: "numeric" });
    }
    if (mode === "day") {
      return cursor.toLocaleDateString([], {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    const start = startOfWeek(cursor);
    const end = addDays(start, 6);
    return `${start.toLocaleDateString([], { month: "short", day: "numeric" })} – ${end.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
  }, [cursor, mode]);

  const move = (dir: -1 | 1) => {
    setCursor((c) => {
      if (mode === "month") return new Date(c.getFullYear(), c.getMonth() + dir, 1);
      if (mode === "day") return addDays(c, dir);
      return addDays(c, dir * 7);
    });
  };
  const jumpToday = () => setCursor(startOfDay(new Date()));

  const totalItems =
    events.length +
    tasks.filter(
      (t) => (t.dueDate || t.scheduledStart) && t.status !== "done",
    ).length;

  // ── Month-cell renderer ─────────────────────────────────────────────
  const renderMonthCell = (day: Date) => {
    const items = itemsByDay.get(day.toDateString()) ?? [];
    const isOther = day.getMonth() !== cursor.getMonth();
    const isToday = sameDay(day, today);
    const maxItems = 3;

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
          {items.slice(0, maxItems).map((it) => {
            const timePrefix = it.scheduledAt
              ? `${formatTimeLabel(it.scheduledAt)} `
              : "";
            return (
              <div
                key={it.id}
                className={`cal-event cal-event--${it.kind}`}
                style={{ background: it.color }}
                title={`${timePrefix}${it.title}`}
              >
                {it.kind === "exam" && "⚑ "}
                {timePrefix && (
                  <span className="cal-event__time">{timePrefix}</span>
                )}
                {it.title}
              </div>
            );
          })}
          {items.length > maxItems && (
            <div className="cal-event-more">+ {items.length - maxItems} more</div>
          )}
        </div>
      </div>
    );
  };

  // ── Hour-grid (week/day) ────────────────────────────────────────────
  const hourGridDays = mode === "day" ? [cursor] : weekGrid;

  const renderHourGrid = () => (
    <div
      className={`cal-hourgrid cal-hourgrid--${mode}`}
      style={{ "--hour-h": `${HOUR_HEIGHT}px` } as React.CSSProperties}
    >
      {/* All-day strip header */}
      <div className="cal-hourgrid__head">
        <div className="cal-hourgrid__head-corner" />
        {hourGridDays.map((d) => {
          const isToday = sameDay(d, today);
          return (
            <div
              key={d.toISOString()}
              className={`cal-hourgrid__head-day${isToday ? " cal-hourgrid__head-day--today" : ""}`}
            >
              <div className="cal-hourgrid__head-weekday">
                {mode === "day" ? WEEKDAYS_LONG[d.getDay()] : WEEKDAYS[d.getDay()]}
              </div>
              <div className="cal-hourgrid__head-date">
                {d.toLocaleDateString([], { month: "short", day: "numeric" })}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day strip body */}
      <div className="cal-hourgrid__allday">
        <div className="cal-hourgrid__allday-label">all-day</div>
        {hourGridDays.map((d) => {
          const bucket = dayData.get(startOfDay(d).toDateString());
          const items = bucket?.allDay ?? [];
          return (
            <div key={d.toISOString()} className="cal-hourgrid__allday-col">
              {items.map((it) => (
                <div
                  key={it.id}
                  className={`cal-event cal-event--${it.kind}`}
                  style={{ background: it.color }}
                  title={it.title}
                >
                  {it.kind === "exam" && "⚑ "}
                  {it.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Scrolling body: hour gutter + day columns */}
      <div className="cal-hourgrid__body">
        <div className="cal-hourgrid__gutter">
          {Array.from({ length: VISIBLE_HOURS }, (_, i) => {
            const hour = VISIBLE_START_HOUR + i;
            return (
              <div
                key={hour}
                className="cal-hourgrid__hour-label"
                style={{ height: HOUR_HEIGHT }}
              >
                {formatHourTick(hour)}
              </div>
            );
          })}
        </div>

        {hourGridDays.map((d) => {
          const bucket = dayData.get(startOfDay(d).toDateString());
          const blocks = bucket?.blocks ?? [];
          const isToday = sameDay(d, today);
          return (
            <div
              key={d.toISOString()}
              className={`cal-hourgrid__col${isToday ? " cal-hourgrid__col--today" : ""}`}
              style={{ height: VISIBLE_HOURS * HOUR_HEIGHT }}
            >
              {Array.from({ length: VISIBLE_HOURS }, (_, i) => (
                <div
                  key={i}
                  className="cal-hourgrid__row"
                  style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                />
              ))}
              {isToday && (() => {
                const now = new Date();
                const minutes =
                  now.getHours() * 60 + now.getMinutes() - VISIBLE_START_HOUR * 60;
                if (minutes < 0 || minutes > VISIBLE_HOURS * 60) return null;
                const top = (minutes / 60) * HOUR_HEIGHT;
                return <div className="cal-hourgrid__now" style={{ top }} />;
              })()}
              {blocks.map((b) => {
                const startMin =
                  b.start.getHours() * 60 + b.start.getMinutes();
                const endMin = b.end.getHours() * 60 + b.end.getMinutes();
                // If the end spills past midnight (next day), clamp.
                const safeEndMin =
                  endMin <= startMin ? VISIBLE_END_HOUR * 60 : endMin;
                const visStart = Math.max(startMin, VISIBLE_START_HOUR * 60);
                const visEnd = Math.min(safeEndMin, VISIBLE_END_HOUR * 60);
                if (visEnd <= visStart) return null;
                const top = ((visStart - VISIBLE_START_HOUR * 60) / 60) * HOUR_HEIGHT;
                const height = Math.max(
                  18,
                  ((visEnd - visStart) / 60) * HOUR_HEIGHT - 2,
                );
                const timeRange = b.isPoint
                  ? formatTimeLabel(b.start)
                  : `${formatTimeLabel(b.start)} – ${formatTimeLabel(b.end)}`;
                return (
                  <div
                    key={b.id}
                    className={`cal-block cal-block--${b.kind}${b.isPoint ? " cal-block--point" : ""}`}
                    style={{
                      top,
                      height,
                      background: b.color,
                    }}
                    title={`${timeRange} · ${b.title}`}
                  >
                    <div className="cal-block__time">{timeRange}</div>
                    <div className="cal-block__title">
                      {b.kind === "exam" && "⚑ "}
                      {b.title}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );

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
                className={`cal-mode${mode === "day" ? " cal-mode--active" : ""}`}
                onClick={() => setMode("day")}
              >
                Day
              </button>
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
        ) : mode === "month" ? (
          <>
            <div className="cal-grid-head">
              {WEEKDAYS.map((d) => (
                <div key={d} className="cal-day-head">{d.toUpperCase()}</div>
              ))}
            </div>
            <div className="cal-grid cal-grid--month">
              {monthGrid.map(renderMonthCell)}
            </div>
          </>
        ) : (
          renderHourGrid()
        )}
      </div>
    </div>
  );
}
