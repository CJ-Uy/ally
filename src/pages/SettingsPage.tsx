import { useState } from "react";

type SettingsTab = "schedule" | "distractions" | "ally" | "notifications" | "account";

const BLOCKED_SITES = ["TikTok", "YouTube", "Instagram", "Reddit", "Twitter / X", "Netflix"];
const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ScheduleTab() {
  const [offDays, setOffDays] = useState(new Set(["Sat", "Sun"]));
  const toggle = (d: string) => setOffDays(prev => {
    const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n;
  });

  return (
    <div className="settings-stack">
      <div className="settings-card">
        <div className="settings-card__label">Pomodoro</div>
        <div className="settings-sliders">
          {[
            { label: "Focus duration", value: 25, unit: "min", pct: 50 },
            { label: "Short break",    value: 5,  unit: "min", pct: 25 },
            { label: "Long break",     value: 20, unit: "min", pct: 67 },
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

      <div className="settings-card">
        <div className="settings-card__label">Study windows</div>
        <div className="settings-sliders">
          <div className="slider-row">
            <div className="slider-row__label">Start no earlier</div>
            <div className="slider-row__track">
              <div className="slider-row__fill" style={{ width: "37%" }} />
              <div className="slider-row__thumb" style={{ left: "37%" }} />
            </div>
            <div className="slider-row__value">9:00 AM</div>
          </div>
          <div className="slider-row">
            <div className="slider-row__label">End no later</div>
            <div className="slider-row__track">
              <div className="slider-row__fill" style={{ width: "88%" }} />
              <div className="slider-row__thumb" style={{ left: "88%" }} />
            </div>
            <div className="slider-row__value">11:00 PM</div>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card__label">Off days</div>
        <div className="semester-offdays">
          {ALL_DAYS.map(d => (
            <button
              key={d}
              type="button"
              className={`semester-offday${offDays.has(d) ? " semester-offday--on" : ""}`}
              onClick={() => toggle(d)}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="settings-card__hint">Sessions won't be scheduled on off days.</div>
      </div>

      <div className="settings-card">
        <div className="settings-card__label">Quick peek</div>
        <div className="settings-quick-peek">
          <div className="settings-peek-row">
            <div className="settings-peek-day">Today</div>
            <div className="settings-peek-slots">
              <span className="sticker sticker--sky">9:00–10:30 · LinAlg</span>
              <span className="sticker sticker--blush">2:00–3:00 · Spanish</span>
            </div>
          </div>
          <div className="settings-peek-row">
            <div className="settings-peek-day">Tomorrow</div>
            <div className="settings-peek-slots">
              <span className="sticker sticker--butter">10:00–11:30 · History</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DistractionsTab() {
  return (
    <div className="settings-stack">
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
    </div>
  );
}

function AllyTab() {
  return (
    <div className="settings-stack">
      <div className="settings-card settings-card--ally">
        <div className="settings-card__label">Ally appearance</div>
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
            <div className="slider-row">
              <div className="slider-row__label">Orb size</div>
              <div className="slider-row__track">
                <div className="slider-row__fill" style={{ width: "50%" }} />
                <div className="slider-row__thumb" style={{ left: "50%" }} />
              </div>
              <div className="slider-row__value">80px</div>
            </div>
          </div>
        </div>
      </div>
      <div className="settings-card">
        <div className="settings-card__label">Ally voice</div>
        <div className="settings-personality">
          {["Casual", "Neutral", "Formal"].map((v, i) => (
            <div key={v} className={`personality-opt${i === 0 ? " personality-opt--active" : ""}`}>{v}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const items = [
    { label: "Session start reminder",    on: true  },
    { label: "Break time alert",          on: true  },
    { label: "Daily study summary",       on: true  },
    { label: "Streak at-risk warning",    on: false },
    { label: "Upcoming exam alert",       on: true  },
  ];
  return (
    <div className="settings-stack">
      <div className="settings-card">
        <div className="settings-card__label">Notification toggles</div>
        {items.map((item, i) => (
          <div key={i} className="settings-notif-row">
            <span className="settings-notif-label">{item.label}</span>
            <div className={`settings-toggle${item.on ? " settings-toggle--on" : ""}`}>
              <div className="settings-toggle__knob" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountTab() {
  return (
    <div className="settings-stack">
      <div className="settings-card">
        <div className="settings-card__label">Account</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--sky)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink)" }}>C</div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 15 }}>Charles</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>charlesjoshuauy@gmail.com</div>
          </div>
        </div>
        <button className="btn btn--sm" type="button">Edit profile</button>
      </div>
      <div className="settings-card">
        <div className="settings-card__label">Data</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn--sm" type="button">Export data</button>
          <button className="btn btn--sm" type="button" style={{ color: "#c0392b", borderColor: "#fca5a5" }}>Delete account</button>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("schedule");

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: "schedule",      label: "Schedule"      },
    { id: "distractions",  label: "Distractions"  },
    { id: "ally",          label: "Ally"          },
    { id: "notifications", label: "Notifications" },
    { id: "account",       label: "Account"       },
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
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            className={`settings-tab${tab === t.id ? " settings-tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "schedule"      && <ScheduleTab />}
      {tab === "distractions"  && <DistractionsTab />}
      {tab === "ally"          && <AllyTab />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "account"       && <AccountTab />}
    </div>
  );
}
