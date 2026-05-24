import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { refreshAll, useActivityToday, useProfile, useSubjects } from "../data/store";

type SettingsTab = "profile" | "notifications" | "subjects" | "ai" | "data" | "mobile";

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

function AiAgentsTab() {
  const [status, setStatus] = useState<AiStatusDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!window.api?.aiStatus) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.aiStatus();
      setStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const renderProvider = (
    label: string,
    primary: boolean,
    p: AiProviderStatusDto | undefined,
  ) => {
    if (!p) return null;
    const dotColor = p.alive ? "#16a34a" : "#dc2626";
    return (
      <div className="settings-card" key={p.provider}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: dotColor,
                display: "inline-block",
              }}
            />
            <div className="settings-card__label" style={{ margin: 0 }}>
              {label}
            </div>
            {primary && (
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: "var(--surface-soft, #eef)",
                  color: "var(--ink-soft)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Primary
              </span>
            )}
            {!primary && (
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: "var(--surface-soft, #eef)",
                  color: "var(--ink-soft)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Fallback
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12,
              color: p.alive ? "#16a34a" : "#dc2626",
              fontWeight: 600,
            }}
          >
            {p.alive ? "ALIVE" : "DOWN"}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "max-content 1fr",
            gap: "4px 12px",
            fontSize: 13,
            color: "var(--ink-soft)",
          }}
        >
          {p.endpoint && (
            <>
              <div>Endpoint</div>
              <div
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  wordBreak: "break-all",
                }}
              >
                {p.endpoint}
              </div>
            </>
          )}
          {p.model && (
            <>
              <div>Model</div>
              <div style={{ fontFamily: "var(--font-mono, monospace)" }}>
                {p.model}
              </div>
            </>
          )}
          {p.latencyMs !== null && (
            <>
              <div>Latency</div>
              <div>{p.latencyMs} ms</div>
            </>
          )}
          {p.error && (
            <>
              <div>Error</div>
              <div style={{ color: "#dc2626" }}>{p.error}</div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="settings-stack">
      <div className="settings-card">
        <div className="settings-card__label">AI provider routing</div>
        <div className="settings-card__hint">
          Ally tries Ollama first for every AI call. If Ollama is unreachable,
          it falls back to the Gemini API. Syllabus PDF parsing extracts text
          locally before sending it to Ollama; Gemini still receives the raw
          PDF when it gets the fallback.
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => void refresh()}
          disabled={loading}
        >
          {loading ? "Checking…" : "Refresh status"}
        </button>
        {error && (
          <span style={{ color: "#dc2626", fontSize: 13 }}>{error}</span>
        )}
      </div>

      {status ? (
        <>
          {renderProvider("Ollama", true, status.ollama)}
          {renderProvider("Gemini", false, status.gemini)}
        </>
      ) : (
        !error && (
          <div className="settings-card" style={{ color: "var(--ink-soft)" }}>
            Checking providers…
          </div>
        )
      )}
    </div>
  );
}

function MobileTab() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"qr" | "text">("qr");

  const load = async () => {
    if (!window.api?.mobilePairingCode) return;
    setLoading(true);
    try {
      const result = await window.api.mobilePairingCode();
      setCode(result);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (!code) return;
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="settings-stack">
      <div className="settings-card">
        <div className="settings-card__label">Pair Ally Mobile</div>
        <div className="settings-card__hint" style={{ marginBottom: 12 }}>
          Open the Ally mobile app, tap <strong>Pair with Desktop</strong>, then scan the QR or paste the text code.
          The code grants the app read access to your Turso database — treat it like a password.
        </div>
        {!code ? (
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "Generating…" : "Show pairing code"}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className={`btn btn--sm${view === "qr" ? " btn--primary" : ""}`}
                onClick={() => setView("qr")}
              >
                QR Code
              </button>
              <button
                type="button"
                className={`btn btn--sm${view === "text" ? " btn--primary" : ""}`}
                onClick={() => setView("text")}
              >
                Text code
              </button>
            </div>

            {view === "qr" ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: "16px",
                  background: "#ffffff",
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                }}
              >
                <QRCodeSVG
                  value={code}
                  size={220}
                  level="M"
                  marginSize={2}
                  bgColor="#ffffff"
                  fgColor="#1e2a3d"
                />
                <div style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center" }}>
                  Open Ally mobile → Pair → Scan QR
                </div>
              </div>
            ) : (
              <textarea
                readOnly
                value={code}
                rows={5}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  resize: "none",
                  wordBreak: "break-all",
                  lineHeight: 1.5,
                }}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn--primary btn--sm" onClick={copy}>
                {copied ? "Copied!" : "Copy text code"}
              </button>
              <button type="button" className="btn btn--sm" onClick={() => setCode(null)}>
                Hide
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="settings-card">
        <div className="settings-card__label">How it works</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, color: "var(--ink-soft)", fontSize: 13 }}>
          <div>1. Install the Ally mobile APK on your Android device.</div>
          <div>2. Tap <strong style={{ color: "var(--ink)" }}>Pair with Desktop</strong> → scan the QR or paste the text code.</div>
          <div>3. Grant Usage Access + Display-over-other-apps when prompted (for the app blocker).</div>
          <div>4. The app will notify you 30 min before scheduled study blocks and when a session starts on this computer.</div>
          <div>5. During an active session, distracting apps will be blocked. Tap <strong style={{ color: "var(--ink)" }}>Negotiate with Ally</strong> to request a break.</div>
        </div>
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
    { id: "ai", label: "AI Agents" },
    { id: "data", label: "Activity" },
    { id: "mobile", label: "Mobile" },
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
      {tab === "ai" && <AiAgentsTab />}
      {tab === "data" && <DataTab />}
      {tab === "mobile" && <MobileTab />}
    </div>
  );
}
