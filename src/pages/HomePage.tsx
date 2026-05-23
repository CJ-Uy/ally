import { useEffect, useState } from "react";
import { useActivityToday } from "../data/store";

function formatMmSs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function Squiggle({ color, width = 80 }: { color: string; width?: number }) {
  return (
    <svg width={width} height={8} viewBox="0 0 80 8">
      <path d="M2 5 Q 10 1, 20 4 T 40 4 T 60 4 T 78 4"
        stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

type HomePageProps = {
  onSessionEnd: () => void;
};

export function HomePage({ onSessionEnd }: HomePageProps) {
  const [snap, setSnap] = useState<SessionStateSnapshot | null>(null);
  const [activity] = useActivityToday();

  useEffect(() => {
    if (!window.api?.sessionGetState) return;
    void window.api.sessionGetState().then(setSnap);
    return window.api.onStateUpdate(setSnap);
  }, []);

  const toggle = () => {
    if (!window.api?.sessionStart) return;
    if (snap?.session.active) void window.api.sessionStop();
    else void window.api.sessionStart();
  };

  const sessionActive = snap?.session.active ?? false;
  const breakActive = snap?.break.active ?? false;
  const paused = snap?.session.paused ?? false;

  const elapsedMs = snap?.session.elapsedMs ?? 0;
  const breakMs = snap?.break.msRemaining ?? 0;
  const timerDisplay = breakActive ? formatMmSs(breakMs) : formatMmSs(elapsedMs);

  let statusLabel = "Focused";
  let stickerClass = "sticker sticker--sage";
  if (breakActive) {
    statusLabel = "On break";
  } else if (paused) {
    statusLabel = "Paused — negotiating";
    stickerClass = "sticker sticker--blush";
  }

  if (!sessionActive) {
    return (
      <div className="idle-hero">
        <img src="/ally.png" alt="Ally" className="idle-hero__ally" />
        <h2 className="idle-hero__heading">Hey there,<br />ready when you are.</h2>
        <Squiggle color="var(--accent)" width={120} />
        <p className="idle-hero__sub">
          I'll keep the noisy stuff out of your way until you're done.
        </p>
        <button className="btn btn--primary" type="button" onClick={toggle}>
          Start study session →
        </button>

        {activity && activity.streakDays > 0 && (
          <div className="stats-grid" style={{ marginTop: 32, maxWidth: 640 }}>
            <div className="card">
              <div className="card__label">Streak</div>
              <div className="card__value">
                {activity.streakDays}
                <span className="card__value-unit">days</span>
              </div>
            </div>
            <div className="card">
              <div className="card__label">Today</div>
              <div className="card__value">{activity.sessionsCompleted}</div>
              <div className="card__sub">sessions done</div>
            </div>
            <div className="card">
              <div className="card__label">Breaks used</div>
              <div className="card__value">{activity.breaksUsed}</div>
            </div>
          </div>
        )}
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
            {activity && (
              <span className="sticker sticker--panel">
                {activity.sessionsCompleted} sessions today
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

      <div className="card card--accent">
        <div className="card__title">Session in progress</div>
        <div className="card__body">
          Your focus session is active. The orb in the corner tracks your time.
        </div>
      </div>
    </>
  );
}
