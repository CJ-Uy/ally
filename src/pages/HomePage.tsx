import { useEffect, useMemo, useState } from "react";
import { useActivityToday } from "../data/store";
import { useBlocklist, usePomodoroSettings } from "../hooks/useSessionSettings";
import { useWrapUpWarning } from "../hooks/useWrapUpWarning";

interface Goal {
  id: string;
  title: string;
  estimatedPomodoros: number;
  completed: boolean;
}

const GOALS_KEY = "ally:session-goals";

type PomodoroFocus = "focus" | "short" | "long";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good evening";
}

function loadGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Goal[];
  } catch {
    return [];
  }
}

function formatMmSs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Squiggle({ color, width = 80 }: { color: string; width?: number }) {
  return (
    <svg width={width} height={8} viewBox="0 0 80 8">
      <path
        d="M2 5 Q 10 1, 20 4 T 40 4 T 60 4 T 78 4"
        stroke={color}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

type HomePageProps = {
  onSessionEnd: () => void;
};

export function HomePage({ onSessionEnd }: HomePageProps) {
  const [snap, setSnap] = useState<SessionStateSnapshot | null>(null);
  const [activity] = useActivityToday();
  const { settings, update } = usePomodoroSettings();
  const { items: blocklist, add: addBlock, remove: removeBlock } = useBlocklist();

  const [goals, setGoals] = useState<Goal[]>(() => loadGoals());
  const [draftGoal, setDraftGoal] = useState("");
  const [draftEst, setDraftEst] = useState(1);
  const [draftBlock, setDraftBlock] = useState("");
  const [editingPomodoro, setEditingPomodoro] = useState<PomodoroFocus | null>(null);

  useEffect(() => {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    if (!window.api?.sessionGetState) return;
    void window.api.sessionGetState().then(setSnap);
    return window.api.onStateUpdate(setSnap);
  }, []);

  const { warning, dismiss } = useWrapUpWarning({
    snap,
    focusMinutes: settings.focusMinutes,
  });

  const startSession = () => {
    if (!window.api?.sessionStart) return;
    void window.api.sessionStart();
  };

  const addGoal = () => {
    const t = draftGoal.trim();
    if (!t) return;
    setGoals((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: t,
        estimatedPomodoros: Math.max(1, draftEst),
        completed: false,
      },
    ]);
    setDraftGoal("");
    setDraftEst(1);
  };
  const toggleGoal = (id: string) =>
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g)));
  const removeGoal = (id: string) =>
    setGoals((prev) => prev.filter((g) => g.id !== id));

  const submitBlock = () => {
    addBlock(draftBlock);
    setDraftBlock("");
  };

  const sessionActive = snap?.session.active ?? false;
  const breakActive = snap?.break.active ?? false;
  const paused = snap?.session.paused ?? false;

  const elapsedMs = snap?.session.elapsedMs ?? 0;
  const breakMs = snap?.break.msRemaining ?? 0;

  const focusTargetMs = settings.focusMinutes * 60_000;
  const phaseElapsedMs = elapsedMs % focusTargetMs;
  const phaseRemainingMs = Math.max(0, focusTargetMs - phaseElapsedMs);
  const phaseProgress = Math.min(1, phaseElapsedMs / focusTargetMs);
  const pomodorosCompleted = Math.floor(elapsedMs / focusTargetMs);

  const totalGoalPomodoros = useMemo(
    () => goals.reduce((sum, g) => (g.completed ? sum : sum + g.estimatedPomodoros), 0),
    [goals],
  );

  const timerDisplay = breakActive
    ? formatMmSs(breakMs)
    : formatMmSs(phaseRemainingMs);

  let statusLabel = "Focused";
  let stickerClass = "sticker sticker--sage";
  if (breakActive) {
    statusLabel = "On break";
    stickerClass = "sticker sticker--sky";
  } else if (paused) {
    statusLabel = "Paused — negotiating";
    stickerClass = "sticker sticker--blush";
  }

  // ── Active session view ──
  if (sessionActive) {
    return (
      <>
        {warning.visible && (
          <WrapUpToast
            kind={warning.kind!}
            secondsLeft={warning.secondsLeft}
            onDismiss={dismiss}
          />
        )}

        <div className="home-active">
          <div className="workspace__header">
            <div>
              <div className="workspace__meta">
                {breakActive ? "Break time" : `Pomodoro ${pomodorosCompleted + 1}`}
              </div>
              <div className="workspace__timer">{timerDisplay}</div>
              <div className="workspace__status">
                <span className={stickerClass}>{statusLabel}</span>
                {!breakActive && pomodorosCompleted > 0 && (
                  <span className="sticker sticker--panel">
                    {pomodorosCompleted} pomodoros done
                  </span>
                )}
              </div>
            </div>
            <div className="workspace__actions">
              <button className="btn" type="button" onClick={onSessionEnd}>
                End session
              </button>
            </div>
          </div>

          {!breakActive && (
            <div className="pomodoro-progress">
              <div
                className="pomodoro-progress__fill"
                style={{ width: `${phaseProgress * 100}%` }}
              />
            </div>
          )}

          <SessionGoals
            goals={goals}
            draftGoal={draftGoal}
            draftEst={draftEst}
            setDraftGoal={setDraftGoal}
            setDraftEst={setDraftEst}
            onAdd={addGoal}
            onToggle={toggleGoal}
            onRemove={removeGoal}
            variant="active"
          />
        </div>
      </>
    );
  }

  // ── Idle / pre-session setup view ──
  const plannedMinutes = totalGoalPomodoros * settings.focusMinutes;

  return (
    <>
      {warning.visible && (
        <WrapUpToast
          kind={warning.kind!}
          secondsLeft={warning.secondsLeft}
          onDismiss={dismiss}
        />
      )}

      {editingPomodoro && (
        <PomodoroModal
          settings={settings}
          focus={editingPomodoro}
          onChange={(patch) => update(patch)}
          onClose={() => setEditingPomodoro(null)}
        />
      )}

      <div className="home-idle">
        <section className="home-stage">
          <img src="/ally.png" alt="Ally" className="home-stage__ally" />
          <div className="home-stage__greeting">
            <span className="home-stage__eyebrow">{greeting()}</span>
            <h2 className="home-stage__heading">Ready when you are.</h2>
            <Squiggle color="var(--fox)" width={120} />
            <p className="home-stage__sub">
              I'll quiet the noisy stuff until you're done. Pick a focus block and we'll begin.
            </p>
          </div>

          <button
            className="home-stage__start"
            type="button"
            onClick={startSession}
            aria-label="Start study session"
          >
            <span className="home-stage__start-label">Begin study session</span>
            <span className="home-stage__start-arrow" aria-hidden>→</span>
          </button>

          <div className="home-timing" role="group" aria-label="Session timing">
            <TimingChip
              label="Focus"
              color="var(--accent)"
              value={settings.focusMinutes}
              onClick={() => setEditingPomodoro("focus")}
            />
            <span className="home-timing__sep" aria-hidden>·</span>
            <TimingChip
              label="Short break"
              color="var(--sky)"
              value={settings.shortBreakMinutes}
              onClick={() => setEditingPomodoro("short")}
            />
            <span className="home-timing__sep" aria-hidden>·</span>
            <TimingChip
              label="Long break"
              color="var(--sage)"
              value={settings.longBreakMinutes}
              onClick={() => setEditingPomodoro("long")}
            />
          </div>

          {plannedMinutes > 0 && (
            <p className="home-stage__planned">
              ~{plannedMinutes} min planned across {goals.filter((g) => !g.completed).length} goal{goals.filter((g) => !g.completed).length === 1 ? "" : "s"}
            </p>
          )}
        </section>

        <SessionGoals
          goals={goals}
          draftGoal={draftGoal}
          draftEst={draftEst}
          setDraftGoal={setDraftGoal}
          setDraftEst={setDraftEst}
          onAdd={addGoal}
          onToggle={toggleGoal}
          onRemove={removeGoal}
          variant="idle"
        />

        <div className="home-grid">
          {/* Blocklist */}
          <section className="card home-card home-card--blocklist">
            <div className="card__head">
              <h3 className="card__title">Blocked during session</h3>
              <span className="card__sub">
                {blocklist.length} item{blocklist.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="home-blocklist">
              {blocklist.length === 0 && (
                <p className="home-empty">Nothing blocked yet.</p>
              )}
              {blocklist.map((b) => (
                <span key={b} className="home-block-pill">
                  {b}
                  <button
                    type="button"
                    onClick={() => removeBlock(b)}
                    className="home-block-pill__remove"
                    aria-label={`Remove ${b}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="home-add-row">
              <input
                type="text"
                placeholder="e.g. youtube.com"
                value={draftBlock}
                onChange={(e) => setDraftBlock(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitBlock()}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn--primary btn--sm" onClick={submitBlock}>
                Add
              </button>
            </div>

            <div className="home-block-hint">
              These trigger Ally's lock screen when you try to open them mid-session.
            </div>
          </section>

          {/* Today snapshot */}
          {activity && (activity.sessionsCompleted > 0 || activity.streakDays > 0) && (
            <section className="card home-card home-card--stats">
              <div className="card__head">
                <h3 className="card__title">Today so far</h3>
                <span className="card__sub">progress</span>
              </div>
              <div className="home-stats-row">
                <div className="home-stat">
                  <div className="home-stat__value">{activity.sessionsCompleted}</div>
                  <div className="home-stat__label">sessions done</div>
                </div>
                <div className="home-stat">
                  <div className="home-stat__value">{activity.breaksUsed}</div>
                  <div className="home-stat__label">breaks used</div>
                </div>
                <div className="home-stat">
                  <div className="home-stat__value">{activity.streakDays}d</div>
                  <div className="home-stat__label">streak</div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

    </>
  );
}

function SessionGoals({
  goals,
  draftGoal,
  draftEst,
  setDraftGoal,
  setDraftEst,
  onAdd,
  onToggle,
  onRemove,
  variant,
}: {
  goals: Goal[];
  draftGoal: string;
  draftEst: number;
  setDraftGoal: (v: string) => void;
  setDraftEst: (updater: (v: number) => number) => void;
  onAdd: () => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  variant: "idle" | "active";
}) {
  const [adding, setAdding] = useState(false);
  const empty = goals.length === 0;
  const doneCount = goals.filter((g) => g.completed).length;

  const submit = () => {
    onAdd();
    if (variant === "active") setAdding(false);
  };

  return (
    <section className={`goals goals--${variant}`} aria-label="Session goals">
      <header className="goals__head">
        <span className="goals__label">
          {variant === "active" ? "What you're working on" : "What for?"}
        </span>
        {!empty && (
          <span className="goals__count">{doneCount}/{goals.length} done</span>
        )}
      </header>

      {empty && variant === "active" && (
        <p className="goals__empty-active">No goals set — just focus.</p>
      )}

      {!empty && (
        <ul className="goals__list">
          {goals.map((g) => (
            <li
              key={g.id}
              className={`goal-row${g.completed ? " goal-row--done" : ""}`}
            >
              <button
                type="button"
                className={`goal-row__check${g.completed ? " goal-row__check--done" : ""}`}
                onClick={() => onToggle(g.id)}
                aria-label={g.completed ? "Mark not done" : "Mark done"}
              >
                {g.completed && (
                  <svg viewBox="0 0 14 14" width="12" height="12" aria-hidden>
                    <path d="M3 7.5 L6 10.5 L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                )}
              </button>
              <span className="goal-row__title">{g.title}</span>
              <span
                className="goal-row__est"
                title={`Estimated ${g.estimatedPomodoros} pomodoro${g.estimatedPomodoros === 1 ? "" : "s"} (~${g.estimatedPomodoros * 25} min)`}
                aria-label={`Estimated ${g.estimatedPomodoros} pomodoros`}
              >
                <span aria-hidden>🍅</span> × {g.estimatedPomodoros}
              </span>
              {variant === "idle" && (
                <button
                  type="button"
                  className="goal-row__remove"
                  onClick={() => onRemove(g.id)}
                  aria-label="Remove"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {variant === "idle" && (
        <div className="goals__add-row">
          <input
            type="text"
            className="goals__input"
            placeholder={empty ? "Finish chapter 4 problems…" : "Add another"}
            value={draftGoal}
            onChange={(e) => setDraftGoal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <div className="goals__stepper" role="group" aria-label="Estimated pomodoros for this goal" title="How many pomodoros you think this will take">
            <button type="button" className="goals__stepper-btn" onClick={() => setDraftEst((v) => Math.max(1, v - 1))} aria-label="Fewer pomodoros" title="Fewer pomodoros">−</button>
            <span className="goals__stepper-val" title="Estimated pomodoros for this goal">🍅 × {draftEst}</span>
            <button type="button" className="goals__stepper-btn" onClick={() => setDraftEst((v) => Math.min(8, v + 1))} aria-label="More pomodoros" title="More pomodoros">+</button>
          </div>
          <button
            type="button"
            className="goals__add-btn"
            onClick={submit}
            disabled={!draftGoal.trim()}
          >
            Add
          </button>
        </div>
      )}

      {variant === "active" && (
        adding ? (
          <div className="goals__add-row goals__add-row--active">
            <input
              type="text"
              className="goals__input"
              placeholder="Add a goal…"
              value={draftGoal}
              onChange={(e) => setDraftGoal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") setAdding(false);
              }}
              autoFocus
            />
            <div className="goals__stepper" role="group" aria-label="Estimated pomodoros">
              <button type="button" className="goals__stepper-btn" onClick={() => setDraftEst((v) => Math.max(1, v - 1))} aria-label="Fewer pomodoros" title="Fewer pomodoros">−</button>
              <span className="goals__stepper-val" title="Estimated pomodoros for this goal">🍅 × {draftEst}</span>
              <button type="button" className="goals__stepper-btn" onClick={() => setDraftEst((v) => Math.min(8, v + 1))} aria-label="More pomodoros" title="More pomodoros">+</button>
            </div>
            <button type="button" className="goals__add-btn" onClick={submit} disabled={!draftGoal.trim()}>
              Add
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="goals__add-quiet"
            onClick={() => setAdding(true)}
          >
            + add a goal
          </button>
        )
      )}
    </section>
  );
}

function TimingChip({
  label,
  color,
  value,
  onClick,
}: {
  label: string;
  color: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button type="button" className="home-timing__chip" onClick={onClick} aria-label={`${label}: ${value} minutes — tap to change`}>
      <span className="home-timing__dot" style={{ background: color }} aria-hidden />
      <span className="home-timing__value">{value}</span>
      <span className="home-timing__unit">min</span>
      <span className="home-timing__label">{label}</span>
    </button>
  );
}

const POMODORO_META: Record<PomodoroFocus, { title: string; key: keyof PomodoroSettingsShape; color: string; min: number; max: number; hint: string }> = {
  focus: {
    title: "Focus block",
    key: "focusMinutes",
    color: "var(--accent)",
    min: 5,
    max: 60,
    hint: "How long you study before a break. 25 is the classic pomodoro.",
  },
  short: {
    title: "Short break",
    key: "shortBreakMinutes",
    color: "var(--sky)",
    min: 1,
    max: 20,
    hint: "Quick reset between focus blocks. Stretch, sip, breathe.",
  },
  long: {
    title: "Long break",
    key: "longBreakMinutes",
    color: "var(--sage)",
    min: 5,
    max: 45,
    hint: "After a few rounds, take a longer one to recharge.",
  },
};

type PomodoroSettingsShape = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
};

function PomodoroModal({
  settings,
  focus,
  onChange,
  onClose,
}: {
  settings: PomodoroSettingsShape;
  focus: PomodoroFocus;
  onChange: (patch: Partial<PomodoroSettingsShape>) => void;
  onClose: () => void;
}) {
  const meta = POMODORO_META[focus];
  const current = settings[meta.key];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (v: number) => {
    const clamped = Math.min(meta.max, Math.max(meta.min, v));
    onChange({ [meta.key]: clamped } as Partial<PomodoroSettingsShape>);
  };

  return (
    <div className="pomo-modal__backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Set ${meta.title.toLowerCase()}`}>
      <div className="pomo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pomo-modal__head">
          <span className="pomo-modal__dot" style={{ background: meta.color }} />
          <h3 className="pomo-modal__title">{meta.title}</h3>
          <button type="button" className="pomo-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="pomo-modal__readout">
          <button
            type="button"
            className="pomo-modal__step"
            onClick={() => set(current - 1)}
            disabled={current <= meta.min}
            aria-label="Decrease"
          >−</button>
          <div className="pomo-modal__value">
            <span className="pomo-modal__num">{current}</span>
            <span className="pomo-modal__unit">min</span>
          </div>
          <button
            type="button"
            className="pomo-modal__step"
            onClick={() => set(current + 1)}
            disabled={current >= meta.max}
            aria-label="Increase"
          >+</button>
        </div>

        <input
          type="range"
          min={meta.min}
          max={meta.max}
          value={current}
          onChange={(e) => set(Number(e.target.value))}
          className="pomo-modal__range"
          style={{ accentColor: meta.color }}
        />

        <div className="pomo-modal__presets">
          {[meta.min, Math.round((meta.min + meta.max) / 3), Math.round((meta.min + meta.max) / 2), meta.max].map((v, i, arr) => (
            arr.indexOf(v) === i && (
              <button
                key={v}
                type="button"
                className={`pomo-modal__preset${current === v ? " pomo-modal__preset--on" : ""}`}
                onClick={() => set(v)}
              >
                {v}
              </button>
            )
          ))}
        </div>

        <p className="pomo-modal__hint">{meta.hint}</p>

        <button type="button" className="btn btn--primary pomo-modal__done" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

function WrapUpToast({
  kind,
  secondsLeft,
  onDismiss,
}: {
  kind: "focus" | "break";
  secondsLeft: number;
  onDismiss: () => void;
}) {
  const title = kind === "focus" ? "Time to wrap up." : "Break's almost over.";
  const message =
    kind === "focus"
      ? "Save your work and get to a clean stopping point."
      : "Get ready to come back — your focus block is up next.";

  return (
    <div className="wrap-up-toast" role="alertdialog" aria-live="assertive">
      <div className="wrap-up-toast__inner">
        <img src="/ally.png" alt="Ally" className="wrap-up-toast__ally" />
        <div className="wrap-up-toast__body">
          <div className="wrap-up-toast__title">{title}</div>
          <div className="wrap-up-toast__msg">{message}</div>
          <div className="wrap-up-toast__countdown">
            {secondsLeft}s remaining
          </div>
        </div>
        <button
          type="button"
          className="btn btn--sm wrap-up-toast__close"
          onClick={onDismiss}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
