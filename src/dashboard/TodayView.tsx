import { useMemo } from "react";
import {
  refreshAll,
  useAtRiskTasks,
  useSubjects,
  useTasks,
  useUpcomingEvents,
} from "../data/store";
import "./TodayView.css";

interface Props {
  onAskAlly?: (prompt: string) => void;
}

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

const FULL_DAY = new Date().toLocaleDateString([], {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export function TodayView({ onAskAlly }: Props = {}) {
  const [tasks] = useTasks();
  const [events] = useUpcomingEvents();
  const [subjects] = useSubjects();
  const [atRisk] = useAtRiskTasks();

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
    await window.api.tasksUpdate(id, { status: "done" });
    refreshAll();
  };

  return (
    <>
      <header className="view-head">
        <div className="view-head__left">
          <span className="view-sub">{FULL_DAY}</span>
          <h1 className="view-title">Today.</h1>
        </div>
        <div className="view-right">
          <span className="today__metric">
            <span className="today__metric-num">{today.length}</span>
            <span className="today__metric-lbl">due today</span>
          </span>
          <span className="today__metric today__metric--alert">
            <span className="today__metric-num">{overdue.length}</span>
            <span className="today__metric-lbl">overdue</span>
          </span>
        </div>
      </header>

      {atRisk.length > 0 && (
        <section className="card atrisk">
          <div className="card__head">
            <h3 className="card__title">Needs attention</h3>
            <span className="view-sub">{atRisk.length} at risk</span>
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
                        <span style={{ color: subj.color }}>● {subj.name}</span>
                      )}
                      <span className="atrisk__reason">{reasonText}</span>
                    </div>
                  </div>
                  {onAskAlly && (
                    <div className="atrisk__actions">
                      <button
                        className="ghost"
                        onClick={() =>
                          onAskAlly(
                            `Break "${a.title}" down into subtasks I can finish before it's due.`,
                          )
                        }
                      >
                        Break down
                      </button>
                      <button
                        className="accent"
                        onClick={() =>
                          onAskAlly(
                            `"${a.title}" is at risk — help me reschedule it.`,
                          )
                        }
                      >
                        Reschedule
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {atRisk.length > 4 && onAskAlly && (
            <button
              className="ghost atrisk__more"
              onClick={() =>
                onAskAlly("Walk me through everything that's at risk right now.")
              }
            >
              Ask Ally about all {atRisk.length}
            </button>
          )}
        </section>
      )}

      <div className="today">
        <section className="card today__main">
          <div className="card__head">
            <h3 className="card__title">Due today</h3>
            <span className="view-sub">{today.length} items</span>
          </div>
          {today.length === 0 ? (
            <div className="today__none">
              <p className="today__none-title">No deadlines today.</p>
              <p className="today__none-sub">A rare and beautiful thing.</p>
            </div>
          ) : (
            <ul className="today__list">
              {today.map((t) => {
                const subj = subjectMap.get(t.subjectId);
                const isOverdue = new Date(t.dueDate ?? 0) < startOfDay();
                return (
                  <li
                    key={t.id}
                    className={`today__item ${isOverdue ? "is-overdue" : ""}`}
                  >
                    <button
                      className="today__check"
                      onClick={() => completeTask(t.id)}
                      title="Mark done"
                    >
                      ○
                    </button>
                    <div className="today__body">
                      <div className="today__title">{t.title}</div>
                      <div className="today__meta">
                        {subj && (
                          <span
                            className="today__subj"
                            style={{ color: subj.color }}
                          >
                            ● {subj.name}
                          </span>
                        )}
                        {t.estimatedMinutes && (
                          <span className="today__est">
                            ~{t.estimatedMinutes}m
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="today__when">
                      {isOverdue && <span className="today__badge">overdue</span>}
                      <span className="today__time">
                        {t.dueDate ? fmtTime(t.dueDate) : ""}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card today__side">
          <div className="card__head">
            <h3 className="card__title">On the calendar</h3>
            <span className="view-sub">today</span>
          </div>
          {todayUpcoming.length === 0 ? (
            <p className="today__quiet">Nothing scheduled.</p>
          ) : (
            <ul className="today__cal">
              {todayUpcoming.map((e) => {
                const subj = subjectMap.get(e.subjectId);
                return (
                  <li key={e.id} className="today__calitem">
                    <span className="today__caltime">{fmtTime(e.startsAt)}</span>
                    <span className="today__caldot" style={{ background: subj?.color }} />
                    <span className="today__caltitle">{e.title}</span>
                    <span className={`today__caltype today__caltype--${e.type}`}>
                      {e.type}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card today__exams">
          <div className="card__head">
            <h3 className="card__title">Coming up</h3>
            <span className="view-sub">exams ahead</span>
          </div>
          {upcomingExams.length === 0 ? (
            <p className="today__quiet">No exams in the pipeline.</p>
          ) : (
            <ul className="today__exam-list">
              {upcomingExams.map((e) => {
                const subj = subjectMap.get(e.subjectId);
                return (
                  <li key={e.id} className="today__exam">
                    <div className="today__exam-dateblock">
                      <span className="today__exam-day">
                        {new Date(e.startsAt).getDate()}
                      </span>
                      <span className="today__exam-month">
                        {new Date(e.startsAt)
                          .toLocaleString([], { month: "short" })
                          .toUpperCase()}
                      </span>
                    </div>
                    <div className="today__exam-body">
                      <div className="today__exam-title">{e.title}</div>
                      <div className="today__exam-meta">
                        {subj && (
                          <span style={{ color: subj.color }}>● {subj.name}</span>
                        )}
                        <span className="today__exam-rel">
                          {fmtRelDate(e.startsAt)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
