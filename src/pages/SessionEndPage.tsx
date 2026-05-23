export function SessionEndPage({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="session-end">
      <div className="session-end__inner">
        <img src="/ally.png" alt="Ally" className="session-end__ally" />
        <div className="session-end__eyebrow">Session complete</div>
        <h2 className="session-end__heading">Good work today.</h2>

        <div className="session-end__stats">
          <div className="session-end__stat">
            <div className="session-end__stat-value">47m</div>
            <div className="session-end__stat-label">Focused</div>
          </div>
          <div className="session-end__stat">
            <div className="session-end__stat-value">1</div>
            <div className="session-end__stat-label">Break</div>
          </div>
          <div className="session-end__stat">
            <div className="session-end__stat-value">3</div>
            <div className="session-end__stat-label">Blocked</div>
          </div>
        </div>

        <div className="session-end__note card">
          <div className="session-end__note-from">From Ally</div>
          <p className="session-end__note-text">
            You pushed through the eigenvalue section — that's the hard part done.
            Tomorrow's the review, and you've got momentum now.
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
