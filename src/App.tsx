import { useEffect, useState } from "react";
import "./App.css";
import { HomePage } from "./pages/HomePage";
import { TodayPage } from "./pages/TodayPage";
import { TasksPage } from "./pages/TasksPage";
import { CalendarPage } from "./pages/CalendarPage";
import { SubjectsPage } from "./pages/SubjectsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SessionEndPage } from "./pages/SessionEndPage";
import { SubjectDetailPage } from "./pages/SubjectDetailPage";
import { AddSubjectPage } from "./pages/AddSubjectPage";
import { AddSemesterPage } from "./pages/AddSemesterPage";
import { Onboarding } from "./onboarding/Onboarding";
import { refreshAll, useTodayTasks, useUpcomingEvents } from "./data/store";

type AppState = "loading" | "onboarding" | "shell";

type Page =
  | "home"
  | "today"
  | "calendar"
  | "tasks"
  | "subjects"
  | "subject-detail"
  | "add-subject"
  | "add-semester"
  | "session-end"
  | "settings";

const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "today", label: "Today" },
  { id: "calendar", label: "Calendar" },
  { id: "tasks", label: "Tasks" },
  { id: "subjects", label: "Subjects" },
  { id: "settings", label: "Settings" },
];

const NAV_IDS = new Set<Page>(["home", "today", "calendar", "tasks", "subjects", "settings"]);

function AppShell() {
  const [page, setPage] = useState<Page>("home");
  const [navPage, setNavPage] = useState<Page>("home");
  const [selectedSubject, setSelectedSubject] = useState<SubjectDto | null>(null);

  const [todayTasks] = useTodayTasks();
  const [upcomingEvents] = useUpcomingEvents();

  const goTo = (id: Page) => {
    setNavPage(id);
    setPage(id);
  };

  const goToSubjectDetail = (s: SubjectDto) => {
    setSelectedSubject(s);
    setPage("subject-detail");
  };

  const activeNavPage = NAV_IDS.has(page) ? page : navPage;
  const isFullscreen = page === "session-end" || page === "add-semester";

  if (isFullscreen) {
    return (
      <div className="app-shell app-shell--fullscreen">
        {page === "session-end" && (
          <SessionEndPage
            onDone={async () => {
              if (window.api?.sessionStop) await window.api.sessionStop();
              setPage("home");
              setNavPage("home");
            }}
            onAnother={async () => {
              if (window.api?.sessionStop) await window.api.sessionStop();
              if (window.api?.sessionStart) await window.api.sessionStart();
              setPage("home");
              setNavPage("home");
            }}
          />
        )}
        {page === "add-semester" && (
          <AddSemesterPage
            onBack={() => setPage("subjects")}
            onDone={() => {
              setPage("subjects");
              setNavPage("subjects");
              refreshAll();
            }}
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
              className={`sidebar-nav__item${activeNavPage === id ? " sidebar-nav__item--active" : ""}`}
              onClick={() => goTo(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {(activeNavPage === "home" || activeNavPage === "today") && todayTasks.length > 0 && (
          <>
            <div className="sidebar__label">Today</div>
            <ul className="task-list">
              {todayTasks.slice(0, 5).map((task) => (
                <li
                  key={task.id}
                  className={`task-item${task.status === "done" ? " task-item--done" : ""}`}
                >
                  <div
                    className={`task-item__check${task.status === "done" ? " task-item__check--done" : ""}`}
                  />
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
        {page === "home" && <HomePage onSessionEnd={() => setPage("session-end")} />}
        {page === "today" && <TodayPage />}
        {page === "calendar" && <CalendarPage />}
        {page === "tasks" && <TasksPage />}
        {page === "subjects" && (
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
              setPage("home");
              setNavPage("home");
              if (window.api?.sessionStart) void window.api.sessionStart();
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
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="app-loading">
        <div className="app-loading__stage">
          <img src="/ally.png" alt="Ally" className="app-loading__ally" />
          <svg className="app-loading__squiggle" width="120" height="10" viewBox="0 0 120 10">
            <path
              d="M2 6 Q 12 1, 22 5 T 42 5 T 62 5 T 82 5 T 102 5 T 118 5"
              stroke="var(--fox)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          <p className="app-loading__label">
            preparing your study room
            <span className="app-loading__dot">.</span>
            <span className="app-loading__dot">.</span>
            <span className="app-loading__dot">.</span>
          </p>
        </div>
      </div>
    );
  }

  if (state === "onboarding") {
    return <Onboarding onDone={() => setState("shell")} />;
  }

  return <AppShell />;
}
