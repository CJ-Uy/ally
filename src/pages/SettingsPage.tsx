const BLOCKED_SITES = ["TikTok", "YouTube", "Instagram", "Reddit", "Twitter / X", "Netflix"];

export function SettingsPage() {
  return (
    <div className="page-settings">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Preferences</div>
          <h2 className="page-title">Settings</h2>
        </div>
      </div>

      <div className="settings-stack">

        {/* Agent personality */}
        <div className="settings-card">
          <div className="settings-card__label">Agent personality</div>
          <div className="settings-personality">
            {["Soft", "Balanced", "Strict"].map((p, i) => (
              <div key={p} className={`personality-opt${i === 1 ? " personality-opt--active" : ""}`}>
                {p}
              </div>
            ))}
          </div>
          <div className="settings-card__hint">
            Balanced: warm but skeptical. Asks before granting. Won't fall for "but it's important" without a reason.
          </div>
        </div>

        {/* Blocklist */}
        <div className="settings-card">
          <div className="settings-card__label">Blocklist · {BLOCKED_SITES.length} items</div>
          <div className="blocklist">
            {BLOCKED_SITES.map(s => (
              <span key={s} className="sticker sticker--blush blocklist__item">
                {s} <button className="blocklist__remove" type="button">×</button>
              </span>
            ))}
            <span className="sticker sticker--panel blocklist__add" role="button">+ add</span>
          </div>
        </div>

        {/* Pomodoro */}
        <div className="settings-card">
          <div className="settings-card__label">Pomodoro</div>
          <div className="settings-sliders">
            {[
              { label: "Focus duration", value: 25, unit: "min", pct: 50 },
              { label: "Short break", value: 5, unit: "min", pct: 25 },
              { label: "Long break", value: 20, unit: "min", pct: 67 },
            ].map(s => (
              <div key={s.label} className="slider-row">
                <div className="slider-row__label">{s.label}</div>
                <div className="slider-row__track">
                  <div className="slider-row__fill" style={{ width: `${s.pct}%` }} />
                  <div className="slider-row__thumb" style={{ left: `${s.pct}%` }} />
                </div>
                <div className="slider-row__value">{s.value} {s.unit}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Ally orb */}
        <div className="settings-card settings-card--ally">
          <div className="settings-card__label">Ally</div>
          <div className="settings-ally-row">
            <img src="/ally.png" alt="Ally" className="settings-ally-img" />
            <div className="settings-ally-sliders">
              <div className="slider-row">
                <div className="slider-row__label">Idle opacity</div>
                <div className="slider-row__track">
                  <div className="slider-row__fill" style={{ width: "20%" }} />
                  <div className="slider-row__thumb" style={{ left: "20%" }} />
                </div>
                <div className="slider-row__value">20%</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
