import { useMemo } from "react";
import {
  refreshAll,
  useAtRiskTasks,
  useSubjects,
  useTasks,
  useUpcomingEvents,
} from "../data/store";

function fmtDuration(minutes: number): string {
  const m = Math.abs(minutes);
  if (m < 60) return `${m}m`;
  const hours = m / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
function fmtRelDate(iso: string) {
  const target = new Date(iso);
  const now = new Date();
  const days = Math.round(
    (startOfDay(target).getTime() - startOfDay(now).getTime()) /
      (24 * 60 * 60 * 1000),
  );
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days}d`;
  return target.toLocaleDateString([], { month: "short", day: "numeric" });
}

type TodayPageProps = {
  onAskAlly?: (prompt: string) => void;
};

export function TodayPage({ onAskAlly }: TodayPageProps) {
  const [tasks] = useTasks();
  const [events] = useUpcomingEvents();
  const [subjects] = useSubjects();
  const [atRisk] = useAtRiskTasks();

  const fullDay = new Date().toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const subjectMap = useMemo(() => {
    return new Map(subjects.map((s) => [s.id, s] as const));
  }, [subjects]);

  const today = useMemo(() => {
    const end = endOfDay();
    return tasks
      .filter((t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) <= end)
      .sort(
        (a, b) =>
          new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime(),
      );
  }, [tasks]);

  const overdue = useMemo(
    () => today.filter((t) => new Date(t.dueDate ?? 0) < startOfDay()),
    [today],
  );

  const todayUpcoming = useMemo(() => {
    const end = endOfDay();
    return events
      .filter((e) => {
        const d = new Date(e.startsAt);
        return d >= startOfDay() && d <= end;
      })
      .sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
  }, [events]);

  const upcomingExams = useMemo(() => {
    return events
      .filter((e) => e.type === "exam" && new Date(e.startsAt) >= startOfDay())
      .sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      )
      .slice(0, 4);
  }, [events]);

  const completeTask = async (id: number) => {
    if (!window.api?.tasksUpdate) return;
    await window.api.tasksUpdate(id, { status: "done" });
    refreshAll();
  };

  return (
    <div className="page-today">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">{fullDay}</div>
          <h2 className="page-title">Today.</h2>
        </div>
        <div className="today-metrics">
          <span className="today-metric">
            <span className="today-metric__num">{today.length}</span>
            <span className="today-metric__lbl">due today</span>
          </span>
          <span className={`today-metric${overdue.length > 0 ? " today-metric--alert" : ""}`}>
            <span className="today-metric__num">{overdue.length}</span>
            <span className="today-metric__lbl">overdue</span>
          </span>
        </div>
      </div>

      {atRisk.length > 0 && (
        <section className="card today-atrisk">
          <div className="card__head">
            <h3 className="card__title">Needs attention</h3>
            <span className="card__sub">{atRisk.length} at risk</span>
          </div>
          <ul className="atrisk__list">
            {atRisk.slice(0, 4).map((a) => {
              const subj = subjectMap.get(a.subjectId);
              const reasonText =
                a.reason === "overdue"
                  ? `Overdue by ${fmtDuration(a.minutesUntilDue)}`
                  : `Only ${fmtDuration(a.minutesUntilDue)} left — ~${a.estimatedMinutes}m of work`;
              return (
                <li key={a.taskId} className="atrisk__item">
                  <div className="atrisk__body">
                    <div className="atrisk__title">{a.title}</div>
                    <div className="atrisk__meta">
                      {subj && (
                        <span className="atrisk__subj" style={{ color: subj.color }}>● {subj.name}</span>
                      )}
                      <span className="atrisk__reason">{reasonText}</span>
                    </div>
                  </div>
                  {onAskAlly && (
                    <div className="atrisk__actions">
                      <button
                        className="btn btn--sm"
                        type="button"
                        onClick={() => onAskAlly(`Break "${a.title}" down into subtasks I can finish before it's due.`)}
                      >
                        Break down
                      </button>
                      <button
                        className="btn btn--sm btn--primary"
                        type="button"
                        onClick={() => onAskAlly(`"${a.title}" is at risk — help me reschedule it.`)}
                      >
                        Reschedule
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="today-grid">
        <section className="card today-main">
          <div className="card__head">
            <h3 className="card__title">Due today</h3>
            <span className="card__sub">{today.length} items</span>
          </div>
          {today.length === 0 ? (
            <div className="today-empty">
              <p className="today-empty__title">No deadlines today.</p>
              <p className="today-empty__sub">A rare and beautiful thing.</p>
            </div>
          ) : (
            <ul className="today-list">
              {today.map((t) => {
                const subj = subjectMap.get(t.subjectId);
                const isOverdue = new Date(t.dueDate ?? 0) < startOfDay();
                return (
                  <li key={t.id} className={`today-list__item${isOverdue ? " today-list__item--overdue" : ""}`}>
                    <button
                      type="button"
                      className="today-list__check"
                      onClick={() => void completeTask(t.id)}
                      title="Mark done"
                      aria-label="Mark done"
                    />
                    <div className="today-list__body">
                      <div className="today-list__title">{t.title}</div>
                      <div className="today-list__meta">
                        {subj && (
                          <span style={{ color: subj.color }}>● {subj.name}</span>
                        )}
                        {t.estimatedMinutes && <span>~{t.estimatedMinutes}m</span>}
                      </div>
                    </div>
                    <div className="today-list__when">
                      {isOverdue && <span className="sticker sticker--blush">overdue</span>}
                      <span className="today-list__time">
                        {t.dueDate ? fmtTime(t.dueDate) : ""}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card today-side">
          <div className="card__head">
            <h3 className="card__title">On the calendar</h3>
            <span className="card__sub">today</span>
          </div>
          {todayUpcoming.length === 0 ? (
            <p className="today-quiet">Nothing scheduled.</p>
          ) : (
            <ul className="today-cal">
              {todayUpcoming.map((e) => {
                const subj = subjectMap.get(e.subjectId);
                return (
                  <li key={e.id} className="today-cal__item">
                    <span className="today-cal__time">{fmtTime(e.startsAt)}</span>
                    <span className="today-cal__dot" style={{ background: subj?.color }} />
                    <span className="today-cal__title">{e.title}</span>
                    <span className={`today-cal__type today-cal__type--${e.type}`}>{e.type}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card today-exams">
          <div className="card__head">
            <h3 className="card__title">Coming up</h3>
            <span className="card__sub">exams ahead</span>
          </div>
          {upcomingExams.length === 0 ? (
            <p className="today-quiet">No exams in the pipeline.</p>
          ) : (
            <ul className="today-exam-list">
              {upcomingExams.map((e) => {
                const subj = subjectMap.get(e.subjectId);
                return (
                  <li key={e.id} className="today-exam">
                    <div className="today-exam__date">
                      <span className="today-exam__day">{new Date(e.startsAt).getDate()}</span>
                      <span className="today-exam__month">
                        {new Date(e.startsAt).toLocaleString([], { month: "short" }).toUpperCase()}
                      </span>
                    </div>
                    <div className="today-exam__body">
                      <div className="today-exam__title">{e.title}</div>
                      <div className="today-exam__meta">
                        {subj && <span style={{ color: subj.color }}>● {subj.name}</span>}
                        <span className="today-exam__rel">{fmtRelDate(e.startsAt)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
