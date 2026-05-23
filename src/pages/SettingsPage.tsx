import { useEffect, useState } from "react";
import { refreshAll, useActivityToday, useProfile, useSubjects } from "../data/store";

type SettingsTab = "profile" | "notifications" | "subjects" | "data";

const NOTIFICATION_ITEMS: { key: NotificationToggleKey; label: string; description: string }[] = [
  {
    key: "notifyAtRisk",
    label: "At-risk tasks",
    description: "Heads-up when a task can't reasonably finish before it's due.",
  },
  {
    key: "notifyDueToday",
    label: "Due today",
    description: "A morning summary of everything due before the day is out.",
  },
  {
    key: "notifyStreakDanger",
    label: "Streak in danger",
    description: "Nudge if your streak is about to break.",
  },
  {
    key: "notifyChatResponse",
    label: "Planner replies",
    description: "OS notification when Ally answers in the background.",
  },
];

function ProfileTab() {
  const [profile, reload] = useProfile();
  const [hours, setHours] = useState<number>(profile?.studyHoursPerWeek ?? 15);
  const [level, setLevel] = useState<string>(profile?.educationLevel ?? "college");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (profile) {
      setHours(profile.studyHoursPerWeek);
      setLevel(profile.educationLevel);
    }
  }, [profile]);

  const save = async () => {
    if (!window.api?.profileSave) return;
    setSaving(true);
    try {
      await window.api.profileSave({
        studyHoursPerWeek: hours,
        educationLevel: level,
      });
      await reload();
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-stack">
      <div className="settings-card">
        <div className="settings-card__label">Weekly study commitment</div>
        <div className="settings-sliders">
          <div className="slider-row">
            <div className="slider-row__label">Hours per week</div>
            <input
              type="range"
              min={3}
              max={50}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <div className="slider-row__value">{hours} hrs</div>
          </div>
        </div>
        <div className="settings-card__hint">
          Used to schedule study blocks and flag tasks that don't fit your weekly budget.
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card__label">Education level</div>
        <div className="settings-personality">
          {[
            { id: "high_school", label: "High school" },
            { id: "college", label: "College" },
          ].map((opt) => (
            <button
              type="button"
              key={opt.id}
              className={`personality-opt${level === opt.id ? " personality-opt--active" : ""}`}
              onClick={() => setLevel(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="button" className="btn btn--primary" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        {savedAt && Date.now() - savedAt < 2500 && (
          <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Saved.</span>
        )}
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [profile, reload] = useProfile();
  const [busy, setBusy] = useState<NotificationToggleKey | null>(null);

  const toggle = async (key: NotificationToggleKey, next: boolean) => {
    if (!window.api?.profileUpdateNotifications) return;
    setBusy(key);
    try {
      await window.api.profileUpdateNotifications({ [key]: next });
      await reload();
    } finally {
      setBusy(null);
    }
  };

  if (!profile) {
    return (
      <div className="settings-stack">
        <div className="settings-card" style={{ color: "var(--ink-soft)" }}>
          Complete onboarding first to manage notifications.
        </div>
      </div>
    );
  }

  return (
    <div className="settings-stack">
      <div className="settings-card">
        <div className="settings-card__label">Notification toggles</div>
        {NOTIFICATION_ITEMS.map((item) => {
          const value = profile[item.key];
          return (
            <div key={item.key} className="settings-notif-row">
              <div>
                <div className="settings-notif-label">{item.label}</div>
                <div style={{ color: "var(--ink-soft)", fontSize: 12, marginTop: 2 }}>
                  {item.description}
                </div>
              </div>
              <button
                type="button"
                className={`settings-toggle${value ? " settings-toggle--on" : ""}`}
                onClick={() => void toggle(item.key, !value)}
                disabled={busy === item.key}
                aria-label={`Toggle ${item.label}`}
              >
                <div className="settings-toggle__knob" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubjectsTab() {
  const [subjects, reload] = useSubjects();
  const [busy, setBusy] = useState<number | null>(null);

  const setFamiliarity = async (id: number, level: SubjectFamiliarity | null) => {
    if (!window.api?.subjectsSetFamiliarity) return;
    setBusy(id);
    try {
      await window.api.subjectsSetFamiliarity(id, level);
      await reload();
      refreshAll();
    } finally {
      setBusy(null);
    }
  };

  if (subjects.length === 0) {
    return (
      <div className="settings-stack">
        <div className="settings-card" style={{ color: "var(--ink-soft)" }}>
          No subjects yet.
        </div>
      </div>
    );
  }

  return (
    <div className="settings-stack">
      <div className="settings-card">
        <div className="settings-card__label">Familiarity</div>
        <div className="settings-card__hint" style={{ marginBottom: 12 }}>
          How comfortable you are with each subject. Ally uses this to weight task estimates.
        </div>
        {subjects.map((s) => (
          <div key={s.id} className="settings-notif-row" style={{ alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, display: "inline-block" }} />
              <div>
                <div className="settings-notif-label">{s.name}</div>
                <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>
                  {s.educationLevel.replace("_", " ")}
                </div>
              </div>
            </div>
            <div className="settings-personality" style={{ flexWrap: "nowrap" }}>
              {(["beginner", "familiar", "confident"] as SubjectFamiliarity[]).map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  className={`personality-opt${s.familiarity === lvl ? " personality-opt--active" : ""}`}
                  onClick={() => void setFamiliarity(s.id, lvl)}
                  disabled={busy === s.id}
                  style={{ textTransform: "capitalize" }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataTab() {
  const [activity] = useActivityToday();
  const [resetting, setResetting] = useState(false);

  const resetPlanner = async () => {
    if (!window.api?.plannerReset) return;
    if (!confirm("Clear planner conversation history?")) return;
    setResetting(true);
    try {
      await window.api.plannerReset();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="settings-stack">
      <div className="settings-card">
        <div className="settings-card__label">Today</div>
        {activity ? (
          <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500 }}>
                {activity.sessionsCompleted}
              </div>
              <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>sessions</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500 }}>
                {activity.breaksUsed}
              </div>
              <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>breaks taken</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500 }}>
                {activity.streakDays}
              </div>
              <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>day streak</div>
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--ink-soft)" }}>No activity yet today.</div>
        )}
      </div>

      <div className="settings-card">
        <div className="settings-card__label">Planner conversation</div>
        <div className="settings-card__hint" style={{ marginBottom: 12 }}>
          Reset Ally's memory of your planner chat. Tasks and events you've already created stay.
        </div>
        <button type="button" className="btn btn--sm" onClick={() => void resetPlanner()} disabled={resetting}>
          {resetting ? "Working…" : "Clear conversation"}
        </button>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("profile");

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "notifications", label: "Notifications" },
    { id: "subjects", label: "Subjects" },
    { id: "data", label: "Activity" },
  ];

  return (
    <div className="page-settings">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Preferences</div>
          <h2 className="page-title">Settings</h2>
        </div>
      </div>

      <div className="settings-tabs">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            className={`settings-tab${tab === t.id ? " settings-tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "subjects" && <SubjectsTab />}
      {tab === "data" && <DataTab />}
    </div>
  );
}
