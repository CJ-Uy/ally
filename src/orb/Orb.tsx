import { useEffect, useState } from "react";

type OrbMode = "idle" | "studying" | "break";

function formatMmSs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function FocusDots() {
  return (
    <svg viewBox="0 0 56 32" width={56} height={32} className="orb__focus-dots" aria-hidden>
      <circle cx="20" cy="20" r="3.5" fill="#6b7a93" opacity="0.4" />
      <circle cx="34" cy="12" r="4.5" fill="#6b7a93" opacity="0.55" />
      <circle cx="50" cy="4"  r="6"   fill="#6b7a93" opacity="0.7" />
    </svg>
  );
}

export function Orb() {
  const [snap, setSnap] = useState<SessionStateSnapshot | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!window.api?.sessionGetState) return;
    void window.api.sessionGetState().then(setSnap);
    return window.api.onStateUpdate(setSnap);
  }, []);

  const mode: OrbMode = !snap?.session.active
    ? "idle"
    : snap.break.active
      ? "break"
      : "studying";

  const onStudyClick = () => {
    if (!window.api?.sessionStart) return;
    if (mode === "idle") void window.api.sessionStart();
    else                 void window.api.sessionStop();
  };

  const onAskClick = () => {
    void window.api?.orbAskAi?.();
  };

  const studyLabel =
    mode === "idle"     ? "Start study" :
    mode === "break"    ? "End break"   :
                          "Stop study";

  const studyIcon =
    mode === "idle"     ? "▶" :
    mode === "break"    ? "☕" :
                          "■";

  return (
    <div
      className={`orb-shell${expanded ? " orb-shell--expanded" : ""}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="orb-actions" aria-hidden={!expanded}>
        <button
          type="button"
          className="orb-action orb-action--ask"
          onClick={onAskClick}
          title="Ask Ally (Ctrl+K)"
          aria-label="Ask Ally"
          tabIndex={expanded ? 0 : -1}
        >
          <span className="orb-action__icon" aria-hidden>✦</span>
          <span className="orb-action__label">Ask Ally</span>
        </button>

        <button
          type="button"
          className={`orb-action orb-action--study orb-action--study-${mode}`}
          onClick={onStudyClick}
          title={studyLabel}
          aria-label={studyLabel}
          tabIndex={expanded ? 0 : -1}
        >
          <span className="orb-action__icon" aria-hidden>{studyIcon}</span>
          <span className="orb-action__label">{studyLabel}</span>
        </button>
      </div>

      <div className={`orb orb--${mode}`} aria-hidden="true">
        <img src="/ally.png" alt="" className="orb__img" />
        {mode === "studying" && <FocusDots />}
        {mode === "break" && snap && (
          <div className="orb__countdown-badge">
            ☕ {formatMmSs(snap.break.msRemaining)}
          </div>
        )}
      </div>
    </div>
  );
}
