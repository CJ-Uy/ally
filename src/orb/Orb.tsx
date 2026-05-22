import { useEffect, useState } from "react";

type OrbMode = "idle" | "studying" | "break";

function formatMmSs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function Orb() {
  const [snap, setSnap] = useState<SessionStateSnapshot | null>(null);

  useEffect(() => {
    void window.api.sessionGetState().then(setSnap);
    const unsubscribe = window.api.onStateUpdate(setSnap);
    return unsubscribe;
  }, []);

  const mode: OrbMode = !snap?.session.active
    ? "idle"
    : snap.break.active
      ? "break"
      : "studying";

  const onClick = () => {
    if (mode === "idle") void window.api.sessionStart();
    else void window.api.sessionStop();
  };

  const label =
    mode === "idle"
      ? "Click to start"
      : mode === "break"
        ? "On break"
        : "Studying — click to stop";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`orb orb--${mode}`}
      title={label}
      aria-label={label}
    >
      {mode === "break" && snap ? (
        <span className="orb__countdown">{formatMmSs(snap.break.msRemaining)}</span>
      ) : (
        <span className="orb__dot" aria-hidden />
      )}
    </button>
  );
}
