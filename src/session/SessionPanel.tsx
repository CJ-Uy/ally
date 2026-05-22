import { useEffect, useState } from "react";
import "./SessionPanel.css";

function formatHhMmSs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function SessionPanel() {
  const [snap, setSnap] = useState<SessionStateSnapshot | null>(null);

  useEffect(() => {
    void window.api.sessionGetState().then(setSnap);
    return window.api.onStateUpdate(setSnap);
  }, []);

  const sessionActive = snap?.session.active ?? false;
  const breakActive = snap?.break.active ?? false;
  const paused = snap?.session.paused ?? false;

  let stateLabel = "Idle";
  let stateClass = "session-state session-state--idle";
  if (sessionActive) {
    if (breakActive) {
      stateLabel = `On break · ${snap ? formatHhMmSs(snap.break.msRemaining) : "0:00"}`;
      stateClass = "session-state session-state--break";
    } else if (paused) {
      stateLabel = "Paused — negotiating";
      stateClass = "session-state session-state--paused";
    } else {
      stateLabel = "Studying";
      stateClass = "session-state session-state--studying";
    }
  }

  const toggle = () => {
    if (sessionActive) void window.api.sessionStop();
    else void window.api.sessionStart();
  };

  return (
    <section className="panel session-panel">
      <h3>Study Session</h3>
      <div className="session-row">
        <span className={stateClass}>{stateLabel}</span>
        <span className="session-elapsed">
          {snap ? formatHhMmSs(snap.session.elapsedMs) : "00:00"}
        </span>
      </div>
      <div className="app__actions">
        <button type="button" onClick={toggle} className="session-toggle">
          {sessionActive ? "Stop session" : "Start session"}
        </button>
      </div>
      <p className="session-hint">
        The orb (bottom-right) is the always-on entry point. Clicking it does
        the same thing as this button.
      </p>
    </section>
  );
}
