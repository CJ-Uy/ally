import { useMemo, useState } from "react";
import { refreshAll, useSubjects, useTasks } from "../data/store";

type FilterMode = "all" | "subject";

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

export function TasksPage() {
  const [tasks] = useTasks();
  const [subjects] = useSubjects();
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDue, setDraftDue] = useState("");
  const [draftEst, setDraftEst] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("subject");
  const [subjectFilter, setSubjectFilter] = useState<number | "all">("all");

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!showDone && t.status === "done") return false;
      if (subjectFilter !== "all" && t.subjectId !== subjectFilter) return false;
      return true;
    });
  }, [tasks, showDone, subjectFilter]);

  const grouped = useMemo(() => {
    const m = new Map<number, TaskDto[]>();
    for (const s of subjects) m.set(s.id, []);
    for (const t of filteredTasks) {
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
  }, [filteredTasks, subjects]);

  const flatSorted = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return ad - bd;
    });
  }, [filteredTasks]);

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s] as const)),
    [subjects],
  );

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
    setEditing(null);
    setDraftTitle("");
    setDraftDue("");
    setDraftEst("");
  };

  const cancelDraft = () => {
    setAdding(null);
    setEditing(null);
    setDraftTitle("");
    setDraftDue("");
    setDraftEst("");
  };

  const submitAdd = async (subjectId: number) => {
    if (!draftTitle.trim() || !window.api?.tasksCreate) return;
    await window.api.tasksCreate({
      subjectId,
      title: draftTitle.trim(),
      dueDate: draftDue ? new Date(draftDue + "T23:59:00").toISOString() : null,
      estimatedMinutes: draftEst ? Number(draftEst) : null,
    });
    cancelDraft();
    refreshAll();
  };

  const startEditing = (t: TaskDto) => {
    setEditing(t.id);
    setAdding(null);
    setDraftTitle(t.title);
    setDraftDue(toInputDate(t.dueDate));
    setDraftEst(t.estimatedMinutes ? String(t.estimatedMinutes) : "");
  };

  const submitEdit = async (id: number) => {
    if (!draftTitle.trim() || !window.api?.tasksUpdate) return;
    await window.api.tasksUpdate(id, {
      title: draftTitle.trim(),
      dueDate: draftDue ? new Date(draftDue + "T23:59:00").toISOString() : null,
      estimatedMinutes: draftEst ? Number(draftEst) : null,
    });
    cancelDraft();
    refreshAll();
  };

  const toggleDone = async (t: TaskDto) => {
    if (!window.api?.tasksUpdate) return;
    await window.api.tasksUpdate(t.id, {
      status: t.status === "done" ? "todo" : "done",
    });
    refreshAll();
  };

  const removeTask = async (id: number) => {
    if (!window.api?.tasksDelete) return;
    if (!confirm("Delete this task?")) return;
    await window.api.tasksDelete(id);
    refreshAll();
  };

  const renderTaskRow = (t: TaskDto, showSubject = false) => {
    const subj = subjectMap.get(t.subjectId);
    if (editing === t.id) {
      return (
        <li key={t.id} className="tasks-row tasks-row--editing">
          <div className="tasks-editor">
            <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} autoFocus />
            <input type="date" value={draftDue} onChange={(e) => setDraftDue(e.target.value)} />
            <input
              type="number"
              min={5}
              max={600}
              step={5}
              value={draftEst}
              placeholder="min"
              onChange={(e) => setDraftEst(e.target.value)}
            />
            <button type="button" className="btn btn--primary btn--sm" onClick={() => void submitEdit(t.id)}>
              Save
            </button>
            <button type="button" className="btn btn--sm" onClick={cancelDraft}>
              Cancel
            </button>
          </div>
        </li>
      );
    }
    return (
      <li key={t.id} className={`tasks-row${t.status === "done" ? " tasks-row--done" : ""}`}>
        <button
          type="button"
          className={`tasks-row__check${t.status === "done" ? " tasks-row__check--done" : ""}`}
          onClick={() => void toggleDone(t)}
          title={t.status === "done" ? "Reopen" : "Mark done"}
          aria-label={t.status === "done" ? "Reopen" : "Mark done"}
        />
        <div className="tasks-row__body">
          <span className="tasks-row__title">{t.title}</span>
          <span className="tasks-row__meta">
            {showSubject && subj && (
              <span style={{ color: subj.color }}>● {subj.name}</span>
            )}
            {t.createdBy === "ai" && <span className="sticker sticker--sky tasks-row__ai">AI</span>}
            {t.estimatedMinutes && <span>~{t.estimatedMinutes}m</span>}
            {t.dueDate && <span>{fmtDate(t.dueDate)}</span>}
          </span>
        </div>
        <div className="tasks-row__actions">
          <button type="button" className="btn btn--sm" onClick={() => startEditing(t)} title="Edit">
            ✎
          </button>
          <button type="button" className="btn btn--sm" onClick={() => void removeTask(t.id)} title="Delete">
            ×
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="page-tasks">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Tasks</div>
          <h2 className="page-title">Everything to do.</h2>
        </div>
        <div className="tasks-metrics">
          <span className="tasks-metric">
            <strong>{totals.open}</strong> open
          </span>
          <span className="tasks-metric tasks-metric--mute">
            <strong>{totals.done}</strong> done
          </span>
        </div>
      </div>

      <div className="tasks-toolbar">
        <div className="tasks-toolbar__group">
          <button
            type="button"
            className={`tasks-tab${filterMode === "subject" ? " tasks-tab--active" : ""}`}
            onClick={() => setFilterMode("subject")}
          >
            Group by subject
          </button>
          <button
            type="button"
            className={`tasks-tab${filterMode === "all" ? " tasks-tab--active" : ""}`}
            onClick={() => setFilterMode("all")}
          >
            Flat list
          </button>
        </div>

        <div className="tasks-toolbar__group">
          <select
            className="tasks-select"
            value={subjectFilter}
            onChange={(e) =>
              setSubjectFilter(e.target.value === "all" ? "all" : Number(e.target.value))
            }
          >
            <option value="all">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <label className="tasks-toggle-label">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
            <span>Show completed</span>
          </label>
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="card tasks-empty">
          <p className="tasks-empty__title">No subjects yet.</p>
          <p className="tasks-empty__sub">Add subjects through onboarding to start tracking tasks.</p>
        </div>
      ) : filterMode === "all" ? (
        <section className="card tasks-flat">
          {flatSorted.length === 0 ? (
            <p className="tasks-empty__sub">Nothing here yet.</p>
          ) : (
            <ul className="tasks-list">
              {flatSorted.map((t) => renderTaskRow(t, true))}
            </ul>
          )}
        </section>
      ) : (
        <div className="tasks-groups">
          {subjects
            .filter((s) => subjectFilter === "all" || s.id === subjectFilter)
            .map((s) => {
              const list = grouped.get(s.id) ?? [];
              const isCollapsed = collapsed.has(s.id);
              const remaining = list.filter((t) => t.status !== "done").length;

              return (
                <section key={s.id} className="card tasks-group">
                  <header
                    className="tasks-group__head"
                    onClick={() => toggleCollapse(s.id)}
                    style={{ borderLeftColor: s.color }}
                  >
                    <span className="tasks-group__dot" style={{ background: s.color }} />
                    <h3 className="tasks-group__name">{s.name}</h3>
                    <span className="tasks-group__count">
                      {remaining} open
                    </span>
                    <span className="tasks-group__caret">{isCollapsed ? "▸" : "▾"}</span>
                  </header>

                  {!isCollapsed && (
                    <ul className="tasks-list">
                      {list.length === 0 && (
                        <li className="tasks-row tasks-row--empty">Nothing here yet.</li>
                      )}
                      {list.map((t) => renderTaskRow(t))}
                      {adding === s.id ? (
                        <li className="tasks-row tasks-row--editing">
                          <div className="tasks-editor">
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
                              type="button"
                              className="btn btn--primary btn--sm"
                              onClick={() => void submitAdd(s.id)}
                            >
                              Add
                            </button>
                            <button type="button" className="btn btn--sm" onClick={cancelDraft}>
                              Cancel
                            </button>
                          </div>
                        </li>
                      ) : (
                        <li className="tasks-row tasks-row--add">
                          <button
                            type="button"
                            className="btn btn--sm"
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
    </div>
  );
}
