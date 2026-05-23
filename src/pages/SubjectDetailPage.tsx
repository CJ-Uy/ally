import { useEffect, useState } from "react";
import { refreshAll } from "../data/store";

type SubjectDetailProps = {
  subject: SubjectDto;
  onBack: () => void;
  onStartSession: () => void;
};

export function SubjectDetailPage({ subject, onBack, onStartSession }: SubjectDetailProps) {
  const [tasks, setTasks] = useState<TaskDto[]>([]);

  useEffect(() => {
    if (!window.api?.tasksListForSubject) return;
    void window.api.tasksListForSubject(subject.id).then(setTasks);
  }, [subject.id]);

  const toggleTask = async (task: TaskDto) => {
    if (!window.api?.tasksUpdate) return;
    const nextStatus = task.status === "done" ? "todo" : "done";
    await window.api.tasksUpdate(task.id, { status: nextStatus });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
    refreshAll();
  };

  const color = subject.color || "var(--sky)";
  const done = tasks.filter(t => t.status === "done").length;
  const familiarityLabel = subject.familiarity
    ? { beginner: "Beginner", familiar: "Familiar", confident: "Confident" }[subject.familiarity]
    : "Not assessed";

  return (
    <div className="subject-detail">
      <div className="subject-detail__bar" style={{ background: color }} />

      <div className="page-header">
        <div>
          <button className="btn btn--sm" type="button" onClick={onBack} style={{ marginBottom: 8 }}>
            ← Back
          </button>
          <div className="page-eyebrow">Subject</div>
          <h2 className="page-title">{subject.name}</h2>
        </div>
        <button className="btn btn--primary" type="button" onClick={onStartSession}>
          Start session →
        </button>
      </div>

      <div className="subject-detail__mini-stats">
        <div className="subject-detail__mini-stat">
          <div className="subject-detail__mini-value">{tasks.length}</div>
          <div className="subject-detail__mini-label">Tasks</div>
        </div>
        <div className="subject-detail__mini-stat">
          <div className="subject-detail__mini-value">{done}</div>
          <div className="subject-detail__mini-label">Done</div>
        </div>
        <div className="subject-detail__mini-stat">
          <div className="subject-detail__mini-value">{familiarityLabel}</div>
          <div className="subject-detail__mini-label">Familiarity</div>
        </div>
        <div className="subject-detail__mini-stat">
          <div className="subject-detail__mini-value">
            {tasks.length > 0 ? `${Math.round((done / tasks.length) * 100)}%` : "—"}
          </div>
          <div className="subject-detail__mini-label">Complete</div>
        </div>
      </div>

      {tasks.length > 0 && (
        <>
          <div className="subject-detail__section-label">Task list</div>
          <div className="chapter-list">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`chapter-row${task.status === "done" ? " chapter-row--done" : ""}`}
                onClick={() => void toggleTask(task)}
                style={{ cursor: "pointer" }}
              >
                <div className={`chapter-row__check${task.status === "done" ? " chapter-row__check--done" : ""}`} />
                <div className="chapter-row__title">{task.title}</div>
                {task.dueDate && (
                  <span className="sticker sticker--fox-soft">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tasks.length === 0 && (
        <div style={{ color: "var(--ink-soft)", marginTop: 24, fontSize: 14 }}>
          No tasks yet. Upload a syllabus to auto-populate tasks.
        </div>
      )}
    </div>
  );
}
