import { useEffect, useState } from "react";
import { refreshAll, useSubjects } from "../data/store";
import { PreTest } from "../pretest/PreTest";
import "./SettingsView.css";

type ToggleKey =
  | "notifyAtRisk"
  | "notifyDueToday"
  | "notifyStreakDanger"
  | "notifyChatResponse";

interface ToggleMeta {
  key: ToggleKey;
  label: string;
  hint: string;
}

const TOGGLES: ToggleMeta[] = [
  {
    key: "notifyAtRisk",
    label: "At-risk deadlines",
    hint: "Native nudge when a task can't finish in the time it has left.",
  },
  {
    key: "notifyDueToday",
    label: "Tasks due today",
    hint: "Morning reminder when there's work on today's list.",
  },
  {
    key: "notifyStreakDanger",
    label: "Streak in danger",
    hint: "Late-afternoon poke if you haven't studied yet.",
  },
  {
    key: "notifyChatResponse",
    label: "Planner replies",
    hint: "Ping when Ally finishes a chat response in the background.",
  },
];

export function SettingsView() {
  const [subjects] = useSubjects();
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean> | null>(null);
  const [activity, setActivity] = useState<ActivityTodayDto | null>(null);
  const [retesting, setRetesting] = useState<number | null>(null);

  useEffect(() => {
    void Promise.all([window.api.profileGet(), window.api.activityToday()]).then(
      ([p, a]) => {
        if (p) {
          setToggles({
            notifyAtRisk: p.notifyAtRisk,
            notifyDueToday: p.notifyDueToday,
            notifyStreakDanger: p.notifyStreakDanger,
            notifyChatResponse: p.notifyChatResponse,
          });
        }
        setActivity(a);
      },
    );
  }, []);

  const setToggle = async (key: ToggleKey, value: boolean) => {
    if (!toggles) return;
    const next = { ...toggles, [key]: value };
    setToggles(next);
    const updated = await window.api.profileUpdateNotifications({ [key]: value });
    if (updated) setToggles(updated);
  };

  if (retesting !== null) {
    const subj = subjects.find((s) => s.id === retesting);
    return (
      <PreTest
        subjectId={retesting}
        subjectName={subj?.name ?? "Subject"}
        onDone={() => {
          setRetesting(null);
          refreshAll();
        }}
        onSkip={() => setRetesting(null)}
      />
    );
  }

  return (
    <>
      <header className="view-head">
        <div className="view-head__left">
          <span className="view-sub">Preferences</span>
          <h1 className="view-title">Settings.</h1>
        </div>
      </header>

      <section className="card">
        <div className="card__head">
          <h3 className="card__title">Notifications</h3>
          <span className="view-sub">native OS</span>
        </div>
        {!toggles ? (
          <p className="settings__quiet">Loading…</p>
        ) : (
          <ul className="settings__toggles">
            {TOGGLES.map((t) => (
              <li key={t.key} className="settings__row">
                <div>
                  <div className="settings__rowtitle">{t.label}</div>
                  <div className="settings__rowhint">{t.hint}</div>
                </div>
                <label className="settings__switch">
                  <input
                    type="checkbox"
                    checked={toggles[t.key]}
                    onChange={(e) => setToggle(t.key, e.target.checked)}
                  />
                  <span className="settings__slider" aria-hidden />
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="card__head">
          <h3 className="card__title">Streak</h3>
          <span className="view-sub">today</span>
        </div>
        {activity ? (
          <div className="settings__streak">
            <div className="settings__streakblock">
              <span className="settings__streaknum">{activity.streakDays}</span>
              <span className="settings__streaklbl">day streak</span>
            </div>
            <div className="settings__streakblock">
              <span className="settings__streaknum">{activity.sessionsCompleted}</span>
              <span className="settings__streaklbl">sessions today</span>
            </div>
            <div className="settings__streakblock">
              <span className="settings__streaknum">{activity.breaksUsed}</span>
              <span className="settings__streaklbl">breaks used</span>
            </div>
          </div>
        ) : (
          <p className="settings__quiet">Loading…</p>
        )}
      </section>

      <section className="card">
        <div className="card__head">
          <h3 className="card__title">Subject familiarity</h3>
          <span className="view-sub">used by the planner</span>
        </div>
        {subjects.length === 0 ? (
          <p className="settings__quiet">Add a subject first.</p>
        ) : (
          <ul className="settings__subjects">
            {subjects.map((s) => (
              <li key={s.id} className="settings__subject">
                <span
                  className="settings__subjdot"
                  style={{ background: s.color }}
                />
                <span className="settings__subjname">{s.name}</span>
                <span
                  className={`settings__fam ${
                    s.familiarity ? `is-${s.familiarity}` : "is-unknown"
                  }`}
                >
                  {s.familiarity ?? "not assessed"}
                </span>
                <button
                  className="ghost settings__retest"
                  onClick={() => setRetesting(s.id)}
                >
                  {s.familiarity ? "Re-assess" : "Take check-in"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
