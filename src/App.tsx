import { useEffect, useState } from "react";
import "./App.css";
import { CalendarPage } from "./pages/CalendarPage";
import { SubjectsPage } from "./pages/SubjectsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SessionEndPage } from "./pages/SessionEndPage";
import { SubjectDetailPage } from "./pages/SubjectDetailPage";
import { AddSubjectPage } from "./pages/AddSubjectPage";
import { AddSemesterPage } from "./pages/AddSemesterPage";
import { Onboarding } from "./onboarding/Onboarding";
import { useTodayTasks, useUpcomingEvents, refreshAll } from "./data/store";

type AppState = "loading" | "onboarding" | "shell";

type Page =
  | "dashboard"
  | "calendar"
  | "subjects"
  | "subject-detail"
  | "add-subject"
  | "add-semester"
  | "session-end"
  | "settings";

function formatMmSs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const NAV_ITEMS: { id: Page | "history"; label: string }[] = [
  { id: "dashboard", label: "Today" },
  { id: "calendar",  label: "Calendar" },
  { id: "subjects",  label: "Subjects" },
  { id: "history",   label: "History" },
  { id: "settings",  label: "Settings" },
];

function Squiggle({ color, width = 80 }: { color: string; width?: number }) {
  return (
    <svg width={width} height={8} viewBox="0 0 80 8">
      <path d="M2 5 Q 10 1, 20 4 T 40 4 T 60 4 T 78 4"
        stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function DashboardPage({ snap, onToggle, onSessionEnd }: {
  snap: SessionStateSnapshot | null;
  onToggle: () => void;
  onSessionEnd: () => void;
}) {
  const sessionActive = snap?.session.active ?? false;
  const breakActive   = snap?.break.active   ?? false;
  const paused        = snap?.session.paused  ?? false;

  const elapsedMs    = snap?.session.elapsedMs  ?? 0;
  const breakMs      = snap?.break.msRemaining  ?? 0;
  const timerDisplay = breakActive ? formatMmSs(breakMs) : formatMmSs(elapsedMs);

  let statusLabel  = "Focused";
  let stickerClass = "sticker sticker--sage";
  if (breakActive)      { statusLabel = "On break"; }
  else if (paused)      { statusLabel = "Paused — negotiating"; stickerClass = "sticker sticker--blush"; }

  if (!sessionActive) {
    return (
      <div className="idle-hero">
        <img src="/ally.png" alt="Ally" className="idle-hero__ally" />
        <h2 className="idle-hero__heading">Hey there,<br />ready when you are.</h2>
        <Squiggle color="var(--accent)" width={120} />
        <p className="idle-hero__sub">
          I'll keep the noisy stuff out of your way until you're done.
        </p>
        <button className="btn btn--primary" type="button" onClick={onToggle}>
          Start study session →
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="workspace__header">
        <div>
          <div className="workspace__meta">
            {breakActive ? "Break" : "Session · studying"}
          </div>
          <div className="workspace__timer">{timerDisplay}</div>
          <div className="workspace__status">
            <span className={stickerClass}>{statusLabel}</span>
          </div>
        </div>
        <div className="workspace__actions">
          <button className="btn" type="button" onClick={onSessionEnd}>End session</button>
        </div>
      </div>

      <div className="card card--accent">
        <div className="card__title">Session in progress</div>
        <div className="card__body">
          Your focus session is active. The orb in the corner tracks your time.
        </div>
      </div>
    </>
  );
}

function AppShell() {
  const [snap, setSnap]   = useState<SessionStateSnapshot | null>(null);
  const [page, setPage]   = useState<Page>("dashboard");
  const [selectedSubject, setSelectedSubject] = useState<SubjectDto | null>(null);
  const [navPage, setNavPage] = useState<Page>("dashboard");

  const [todayTasks] = useTodayTasks();
  const [upcomingEvents] = useUpcomingEvents();

  useEffect(() => {
    if (!window.api?.sessionGetState) return;
    void window.api.sessionGetState().then(setSnap);
    return window.api.onStateUpdate(setSnap);
  }, []);

  const toggle = () => {
    if (!window.api?.sessionStart) return;
    if (snap?.session.active) void window.api.sessionStop();
    else                      void window.api.sessionStart();
  };

  const goTo = (id: Page | "history") => {
    if (id === "history") return;
    const target = id as Page;
    setNavPage(target);
    setPage(target);
  };

  const goToSubjectDetail = (s: SubjectDto) => {
    setSelectedSubject(s);
    setPage("subject-detail");
  };

  const activeNavPage = (["dashboard", "calendar", "subjects", "settings"] as Page[]).includes(page)
    ? page
    : navPage;

  const isFullscreen = page === "session-end" || page === "add-semester";

  if (isFullscreen) {
    return (
      <div className="app-shell app-shell--fullscreen">
        {page === "session-end" && (
          <SessionEndPage onRestart={() => { setPage("dashboard"); setNavPage("dashboard"); void toggle(); }} />
        )}
        {page === "add-semester" && (
          <AddSemesterPage
            onBack={() => setPage("subjects")}
            onDone={() => { setPage("subjects"); setNavPage("subjects"); refreshAll(); }}
          />
        )}
      </div>
    );
  }

  const nextEvent = upcomingEvents[0] ?? null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/ally.png" alt="Ally" className="brand__ally" />
          <span className="brand__name">Ally</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`sidebar-nav__item${activeNavPage === id ? " sidebar-nav__item--active" : ""}${id === "history" ? " sidebar-nav__item--disabled" : ""}`}
              onClick={() => goTo(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {activeNavPage === "dashboard" && todayTasks.length > 0 && (
          <>
            <div className="sidebar__label">Today</div>
            <ul className="task-list">
              {todayTasks.slice(0, 5).map((task) => (
                <li key={task.id} className={`task-item${task.status === "done" ? " task-item--done" : ""}`}>
                  <div className={`task-item__check${task.status === "done" ? " task-item__check--done" : ""}`} />
                  <div>
                    <div className="task-item__title">{task.title}</div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {nextEvent && (
          <div className="sidebar__upcoming">
            <div className="sidebar__upcoming-label">Upcoming</div>
            <div className="sidebar__upcoming-event">{nextEvent.title}</div>
            <div style={{ color: "var(--fox)", fontSize: 12, marginTop: 2 }}>
              {new Date(nextEvent.startsAt).toLocaleDateString()}
            </div>
          </div>
        )}
      </aside>

      <main className="workspace">
        {page === "dashboard" && (
          <DashboardPage
            snap={snap}
            onToggle={toggle}
            onSessionEnd={() => setPage("session-end")}
          />
        )}
        {page === "calendar"  && <CalendarPage />}
        {page === "subjects"  && (
          <SubjectsPage
            onSelectSubject={goToSubjectDetail}
            onAddSubject={() => setPage("add-subject")}
            onAddSemester={() => setPage("add-semester")}
          />
        )}
        {page === "subject-detail" && selectedSubject && (
          <SubjectDetailPage
            subject={selectedSubject}
            onBack={() => setPage("subjects")}
            onStartSession={() => {
              setPage("dashboard");
              setNavPage("dashboard");
              if (!snap?.session.active) toggle();
            }}
          />
        )}
        {page === "add-subject" && (
          <AddSubjectPage
            onBack={() => setPage("subjects")}
            onAddSemester={() => setPage("add-semester")}
          />
        )}
        {page === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>("loading");

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        if (window.api?.schemaBootstrap) {
          await window.api.schemaBootstrap();
        }
        const profile = window.api?.profileGet ? await window.api.profileGet() : null;
        if (cancelled) return;
        setState(profile ? "shell" : "onboarding");
      } catch (err) {
        console.error("[app] bootstrap failed:", err);
        if (!cancelled) setState("onboarding");
      }
    };
    void init();
    return () => { cancelled = true; };
  }, []);

  if (state === "loading") {
    return (
      <div className="app-loading">
        <span className="app-loading__mark">A</span>
        <p>preparing your study room…</p>
      </div>
    );
  }

  if (state === "onboarding") {
    return <Onboarding onDone={() => setState("shell")} />;
  }

  return <AppShell />;
}
