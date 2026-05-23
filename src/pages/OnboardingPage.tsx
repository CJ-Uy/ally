import { useState } from "react";

const ALL_SITES = [
  "TikTok", "YouTube", "Instagram", "Reddit", "Twitter / X",
  "Netflix", "Discord", "Pinterest", "Twitch", "Hacker News",
];

export function OnboardingPage({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(["TikTok", "YouTube", "Instagram", "Reddit", "Twitter / X", "Netflix"])
  );

  const toggle = (site: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(site) ? next.delete(site) : next.add(site);
      return next;
    });
  };

  if (step === 1) {
    return (
      <div className="onboard-screen">
        <div className="onboard-step-label">Step 1 of 3</div>
        <img src="/ally.png" alt="Ally" className="onboard-ally" />
        <h1 className="onboard-heading">Hi.<br />I'm Ally.</h1>
        <p className="onboard-sub">
          I help you protect your focus time — blocking distractions, tracking
          study sessions, and nudging you when you drift.
        </p>
        <p className="onboard-sub" style={{ marginTop: 0 }}>
          Setup takes about 2 minutes. Let's make sure I know what to block.
        </p>
        <button className="btn btn--primary" type="button" onClick={() => setStep(2)}>
          Let's go →
        </button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="onboard-screen">
        <div className="onboard-step-label">Step 2 of 3</div>
        <h2 className="onboard-heading" style={{ fontSize: 32 }}>
          What pulls you away?
        </h2>
        <p className="onboard-sub">
          Select the sites to block during study sessions. You can change this later.
        </p>
        <div className="onboard-chips">
          {ALL_SITES.map(site => (
            <button
              key={site}
              type="button"
              className={`onboard-chip${selected.has(site) ? " onboard-chip--on" : ""}`}
              onClick={() => toggle(site)}
            >
              {selected.has(site) ? "✓ " : ""}{site}
            </button>
          ))}
        </div>
        <div className="onboard-actions">
          <button className="btn" type="button" onClick={() => setStep(1)}>← Back</button>
          <button className="btn btn--primary" type="button" onClick={() => setStep(3)}>
            Looks good →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboard-screen">
      <div className="onboard-step-label">Step 3 of 3</div>
      <img src="/ally.png" alt="Ally" className="onboard-ally" />
      <h2 className="onboard-heading" style={{ fontSize: 32 }}>You're all set.</h2>
      <p className="onboard-sub">
        {selected.size} site{selected.size !== 1 ? "s" : ""} will be blocked during sessions.
        You can add more in Settings anytime.
      </p>
      <div className="onboard-chips" style={{ marginBottom: 8 }}>
        {[...selected].map(site => (
          <span key={site} className="sticker sticker--blush">{site}</span>
        ))}
      </div>
      <button className="btn btn--primary" type="button" onClick={onDone}>
        Start using Ally →
      </button>
    </div>
  );
}
