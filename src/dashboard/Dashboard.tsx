import { useState } from "react";
import { SessionPanel } from "../session/SessionPanel";
import {
  refreshAll,
  useEvents,
  useSubjects,
  useTasks,
} from "../data/store";
import { TodayView } from "./TodayView";
import { CalendarView } from "./CalendarView";
import { TasksView } from "./TasksView";
import { PlannerChat } from "./PlannerChat";
import { SettingsView } from "./SettingsView";
import "./Dashboard.css";

type View = "today" | "calendar" | "tasks" | "planner" | "settings";

const NAV: Array<{ id: View; num: string; label: string; hint: string }> = [
  { id: "today", num: "01", label: "Today", hint: "what's on deck" },
  { id: "calendar", num: "02", label: "Calendar", hint: "weeks & months" },
  { id: "tasks", num: "03", label: "Tasks", hint: "by subject" },
  { id: "planner", num: "04", label: "Plan", hint: "talk to ally" },
  { id: "settings", num: "05", label: "Settings", hint: "preferences" },
];

export function Dashboard() {
  const [view, setView] = useState<View>("today");
  const [plannerPrefill, setPlannerPrefill] = useState<string | null>(null);
  const [subjects, , subjectsMeta] = useSubjects();
  const [tasks, , tasksMeta] = useTasks();
  const [events, , eventsMeta] = useEvents();

  const askAlly = (prompt: string) => {
    setPlannerPrefill(prompt);
    setView("planner");
  };

  const openTasks = tasks.filter((t) => t.status !== "done").length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const upcomingEvents = events.filter(
    (e) => new Date(e.startsAt) >= new Date(),
  ).length;

  const isLoading =
    subjectsMeta.loading || tasksMeta.loading || eventsMeta.loading;
  const anyError =
    subjectsMeta.error?.message ??
    tasksMeta.error?.message ??
    eventsMeta.error?.message ??
    null;

  return (
    <div className="dash">
      <aside className="dash__rail">
        <div className="dash__brand">
          <span className="dash__mark">A</span>
          <div>
            <span className="dash__brandtext">Ally</span>
            <span className="dash__brandsub">study companion</span>
          </div>
        </div>

        <nav className="dash__nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`dash__navitem ${view === n.id ? "is-active" : ""}`}
              onClick={() => setView(n.id)}
            >
              <span className="dash__navnum">{n.num}</span>
              <span className="dash__navmain">
                <span className="dash__navlabel">{n.label}</span>
                <span className="dash__navhint">{n.hint}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="dash__diag">
          <div className="dash__diaghead">
            <span className="eyebrow">Data</span>
            <button
              className="dash__refresh"
              onClick={() => refreshAll()}
              title="Reload from database"
            >
              {isLoading ? "…" : "↻"}
            </button>
          </div>
          <ul className="dash__diaglist">
            <li>
              <span>Subjects</span>
              <strong>{subjects.length}</strong>
            </li>
            <li>
              <span>Open tasks</span>
              <strong>{openTasks}</strong>
            </li>
            <li>
              <span>Done tasks</span>
              <strong>{doneTasks}</strong>
            </li>
            <li>
              <span>Upcoming events</span>
              <strong>{upcomingEvents}</strong>
            </li>
          </ul>
          {anyError && <p className="dash__diagerror">⚠ {anyError}</p>}
        </div>

        <div className="dash__subjects">
          <p className="eyebrow dash__subjhead">Subjects</p>
          <ul className="dash__subjlist">
            {subjects.length === 0 && (
              <li className="dash__subjempty">none yet</li>
            )}
            {subjects.map((s) => (
              <li key={s.id} className="dash__subjitem">
                <span
                  className="dash__subjdot"
                  style={{ background: s.color }}
                />
                <span className="dash__subjname">{s.name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="dash__sessionwrap">
          <SessionPanel />
        </div>
      </aside>

      <main className="dash__main">
        {view === "today" && <TodayView onAskAlly={askAlly} />}
        {view === "calendar" && <CalendarView />}
        {view === "tasks" && <TasksView />}
        {view === "planner" && (
          <PlannerChat
            prefill={plannerPrefill}
            onPrefillConsumed={() => setPlannerPrefill(null)}
          />
        )}
        {view === "settings" && <SettingsView />}
      </main>
    </div>
  );
}
