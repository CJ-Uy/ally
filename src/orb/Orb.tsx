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

  const onClick = () => {
    if (!window.api?.sessionStart) return;
    if (mode === "idle") void window.api.sessionStart();
    else                 void window.api.sessionStop();
  };

  const label =
    mode === "idle"     ? "Click to start studying" :
    mode === "break"    ? "On break" :
                          "Studying — click to stop";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`orb orb--${mode}`}
      title={label}
      aria-label={label}
    >
      <img src="/ally.png" alt="Ally" className="orb__img" />
      {mode === "studying" && <FocusDots />}
      {mode === "break" && snap && (
        <div className="orb__countdown-badge">
          ☕ {formatMmSs(snap.break.msRemaining)}
        </div>
      )}
    </button>
  );
}
