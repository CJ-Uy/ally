import { useActivityToday } from "../data/store";

export function SessionEndPage({ onRestart }: { onRestart: () => void }) {
  const [activity] = useActivityToday();

  const sessionsCompleted = activity?.sessionsCompleted ?? 0;
  const breaksUsed = activity?.breaksUsed ?? 0;
  const streakDays = activity?.streakDays ?? 0;

  const focusedLabel = sessionsCompleted > 0
    ? `${sessionsCompleted}`
    : "—";

  return (
    <div className="session-end">
      <div className="session-end__inner">
        <img src="/ally.png" alt="Ally" className="session-end__ally" />
        <div className="session-end__eyebrow">Session complete</div>
        <h2 className="session-end__heading">Good work today.</h2>

        <div className="session-end__stats">
          <div className="session-end__stat">
            <div className="session-end__stat-value">{focusedLabel}</div>
            <div className="session-end__stat-label">Sessions</div>
          </div>
          <div className="session-end__stat">
            <div className="session-end__stat-value">{breaksUsed}</div>
            <div className="session-end__stat-label">Breaks</div>
          </div>
          <div className="session-end__stat">
            <div className="session-end__stat-value">{streakDays}d</div>
            <div className="session-end__stat-label">Streak</div>
          </div>
        </div>

        <div className="session-end__note card">
          <div className="session-end__note-from">From Ally</div>
          <p className="session-end__note-text">
            {streakDays >= 3
              ? `You've kept this streak going for ${streakDays} days — that's how habits stick. Rest well.`
              : sessionsCompleted > 0
                ? "Every session counts. Come back tomorrow and the streak builds itself."
                : "A clean start. The hardest part is sitting down — and you did that."}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" type="button" onClick={onRestart}>Done for now</button>
          <button className="btn btn--primary" type="button" onClick={onRestart}>
            Another session →
          </button>
        </div>
      </div>
    </div>
  );
}

