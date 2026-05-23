import { useMemo, useState } from "react";
import { refreshAll, useSubjects, useTasks } from "../data/store";
import "./TasksView.css";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function toInputDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function TasksView() {
  const [tasks] = useTasks();
  const [subjects] = useSubjects();
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDue, setDraftDue] = useState("");
  const [draftEst, setDraftEst] = useState("");
  const [showDone, setShowDone] = useState(false);

  const grouped = useMemo(() => {
    const m = new Map<number, TaskDto[]>();
    for (const s of subjects) m.set(s.id, []);
    for (const t of tasks) {
      if (!showDone && t.status === "done") continue;
      const arr = m.get(t.subjectId);
      if (arr) arr.push(t);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd;
      });
    }
    return m;
  }, [tasks, subjects, showDone]);

  const totals = useMemo(() => {
    return {
      open: tasks.filter((t) => t.status !== "done").length,
      done: tasks.filter((t) => t.status === "done").length,
    };
  }, [tasks]);

  const toggleCollapse = (id: number) => {
    setCollapsed((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startAdding = (subjectId: number) => {
    setAdding(subjectId);
    setDraftTitle("");
    setDraftDue("");
    setDraftEst("");
  };

  const cancelAdding = () => {
    setAdding(null);
    setDraftTitle("");
    setDraftDue("");
    setDraftEst("");
  };

  const submitAdd = async (subjectId: number) => {
    if (!draftTitle.trim()) return;
    await window.api.tasksCreate({
      subjectId,
      title: draftTitle.trim(),
      dueDate: draftDue ? new Date(draftDue + "T23:59:00").toISOString() : null,
      estimatedMinutes: draftEst ? Number(draftEst) : null,
    });
    cancelAdding();
    refreshAll();
  };

  const startEditing = (t: TaskDto) => {
    setEditing(t.id);
    setDraftTitle(t.title);
    setDraftDue(toInputDate(t.dueDate));
    setDraftEst(t.estimatedMinutes ? String(t.estimatedMinutes) : "");
  };

  const submitEdit = async (id: number) => {
    if (!draftTitle.trim()) return;
    await window.api.tasksUpdate(id, {
      title: draftTitle.trim(),
      dueDate: draftDue ? new Date(draftDue + "T23:59:00").toISOString() : null,
      estimatedMinutes: draftEst ? Number(draftEst) : null,
    });
    setEditing(null);
    refreshAll();
  };

  const toggleDone = async (t: TaskDto) => {
    await window.api.tasksUpdate(t.id, {
      status: t.status === "done" ? "todo" : "done",
    });
    refreshAll();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this task?")) return;
    await window.api.tasksDelete(id);
    refreshAll();
  };

  return (
    <>
      <header className="view-head">
        <div className="view-head__left">
          <span className="view-sub">Tasks</span>
          <h1 className="view-title">Everything to do.</h1>
        </div>
        <div className="view-right">
          <span className="tasks__metric">
            <strong>{totals.open}</strong> open
          </span>
          <span className="tasks__metric tasks__metric--mute">
            <strong>{totals.done}</strong> done
          </span>
          <label className="tasks__toggle">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setShowDone(e.target.checked)}
            />
            Show completed
          </label>
        </div>
      </header>

      {subjects.length === 0 ? (
        <div className="empty">
          <p className="empty__title">No subjects yet.</p>
          <p>Add subjects through onboarding to start tracking tasks.</p>
        </div>
      ) : (
        <div className="tasks">
          {subjects.map((s) => {
            const list = grouped.get(s.id) ?? [];
            const isCollapsed = collapsed.has(s.id);
            const remaining = list.filter((t) => t.status !== "done").length;

            return (
              <section key={s.id} className="tasks__group">
                <header
                  className="tasks__grouphead"
                  onClick={() => toggleCollapse(s.id)}
                  style={{ borderLeftColor: s.color }}
                >
                  <span
                    className="tasks__groupdot"
                    style={{ background: s.color }}
                  />
                  <h2 className="tasks__groupname">{s.name}</h2>
                  <span className="tasks__groupcount">
                    {remaining} <span>open</span>
                  </span>
                  <span className="tasks__caret">
                    {isCollapsed ? "▸" : "▾"}
                  </span>
                </header>

                {!isCollapsed && (
                  <ul className="tasks__list">
                    {list.length === 0 && (
                      <li className="tasks__none">
                        Nothing here yet.
                      </li>
                    )}
                    {list.map((t) => (
                      <li
                        key={t.id}
                        className={`tasks__row ${t.status === "done" ? "is-done" : ""}`}
                      >
                        {editing === t.id ? (
                          <div className="tasks__editor">
                            <input
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                              autoFocus
                            />
                            <input
                              type="date"
                              value={draftDue}
                              onChange={(e) => setDraftDue(e.target.value)}
                            />
                            <input
                              type="number"
                              min={5}
                              max={600}
                              step={5}
                              value={draftEst}
                              placeholder="min"
                              onChange={(e) => setDraftEst(e.target.value)}
                            />
                            <button
                              className="accent"
                              onClick={() => submitEdit(t.id)}
                            >
                              Save
                            </button>
                            <button
                              className="ghost"
                              onClick={() => setEditing(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              className="tasks__check"
                              onClick={() => toggleDone(t)}
                              title={t.status === "done" ? "Reopen" : "Done"}
                            >
                              {t.status === "done" ? "●" : "○"}
                            </button>
                            <div className="tasks__body">
                              <span className="tasks__title">{t.title}</span>
                              <span className="tasks__meta">
                                {t.createdBy === "ai" && (
                                  <span className="tasks__ai">ai</span>
                                )}
                                {t.estimatedMinutes && (
                                  <span>~{t.estimatedMinutes}m</span>
                                )}
                                {t.dueDate && <span>{fmtDate(t.dueDate)}</span>}
                              </span>
                            </div>
                            <div className="tasks__actions">
                              <button
                                className="ghost tasks__icon"
                                onClick={() => startEditing(t)}
                                title="Edit"
                              >
                                ✎
                              </button>
                              <button
                                className="ghost tasks__icon"
                                onClick={() => remove(t.id)}
                                title="Delete"
                              >
                                ×
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                    {adding === s.id ? (
                      <li className="tasks__row tasks__addrow">
                        <div className="tasks__editor">
                          <input
                            placeholder="New task title…"
                            value={draftTitle}
                            onChange={(e) => setDraftTitle(e.target.value)}
                            autoFocus
                          />
                          <input
                            type="date"
                            value={draftDue}
                            onChange={(e) => setDraftDue(e.target.value)}
                          />
                          <input
                            type="number"
                            min={5}
                            max={600}
                            step={5}
                            value={draftEst}
                            placeholder="min"
                            onChange={(e) => setDraftEst(e.target.value)}
                          />
                          <button
                            className="accent"
                            onClick={() => submitAdd(s.id)}
                          >
                            Add
                          </button>
                          <button className="ghost" onClick={cancelAdding}>
                            Cancel
                          </button>
                        </div>
                      </li>
                    ) : (
                      <li className="tasks__addtrigger">
                        <button
                          className="ghost"
                          onClick={() => startAdding(s.id)}
                        >
                          + Add task
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
