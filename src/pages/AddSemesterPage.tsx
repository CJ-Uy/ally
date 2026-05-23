import { useState } from "react";

type AddSemesterProps = { onBack: () => void; onDone: () => void };

const MOCK_FILES = [
  { name: "linear-algebra-syllabus.pdf", size: "142 KB", status: "done"    as const },
  { name: "history-syllabus.docx",       size: "89 KB",  status: "done"    as const },
  { name: "spanish-course-guide.pdf",    size: "203 KB", status: "reading" as const },
  { name: "creative-writing-brief.txt",  size: "12 KB",  status: "pending" as const },
];

const OFF_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SUBJECTS_CALIB = [
  { name: "Linear Algebra", color: "var(--sky)" },
  { name: "History",        color: "var(--butter)" },
  { name: "Spanish",        color: "var(--blush)" },
  { name: "Creative Writing", color: "var(--sage)" },
];

const PLAN_WEEKS = [
  { label: "Week 1 · May 19–25", entries: ["LinAlg Ch.3", "History M2", "Spanish vocab"], updated: false },
  { label: "Week 2 · May 26–Jun 1", entries: ["LinAlg Ch.4", "Essay outline", "History M3"], updated: true },
  { label: "Week 3 · Jun 2–8",  entries: ["LinAlg review", "Spanish quiz prep", "Essay draft"], updated: false },
  { label: "Week 4 · Jun 9–15", entries: ["LinAlg exam", "Essay revision", "History essay"], updated: false },
];

const CHAT_MSGS = [
  { from: "ally" as const, text: "Your plan's locked. I'll remind you 30 minutes before each study block." },
  { from: "user" as const, text: "Can you shift the Spanish quiz prep earlier?" },
  { from: "ally" as const, text: "Done — moved Spanish quiz prep to Wednesday of Week 2. That gives you an extra review day before the quiz." },
];

export function AddSemesterPage({ onBack, onDone }: AddSemesterProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [offDays, setOffDays] = useState<Set<string>>(new Set(["Sat", "Sun"]));
  const [chatInput, setChatInput] = useState("");

  const toggleDay = (d: string) => {
    setOffDays(prev => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  };

  return (
    <div className="add-semester">
      {/* Step bar */}
      <div className="semester-steps">
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} className={`semester-step${step >= n ? " semester-step--done" : ""}${step === n ? " semester-step--active" : ""}`}>
            {n}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="semester-panel">
          <div className="page-eyebrow">Add semester · Step 1 of 5</div>
          <h2 className="page-title">Drop all your syllabuses.</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
            Ally will read each one and build a study plan that fits your semester.
          </p>

          <div className="add-subject__drop-zone" style={{ marginBottom: 16 }}>
            <div className="add-subject__drop-icon">↑</div>
            <div className="add-subject__drop-label">Drop syllabuses here</div>
            <div className="add-subject__drop-formats">PDF · DOCX · IMAGE · TXT</div>
            <button className="btn" type="button" style={{ marginTop: 12 }}>Browse files</button>
          </div>

          <div className="semester-file-list">
            {MOCK_FILES.map((f, i) => (
              <div key={i} className="semester-file-row">
                <div className={`semester-file-icon semester-file-icon--${f.status}`} />
                <div className="semester-file-name">{f.name}</div>
                <div className="semester-file-size">{f.size}</div>
              </div>
            ))}
          </div>

          <div className="semester-panel__actions">
            <button className="btn" type="button" onClick={onBack}>← Back</button>
            <button className="btn btn--primary" type="button" onClick={() => setStep(2)}>
              Read them →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="semester-panel">
          <div className="page-eyebrow">Add semester · Step 2 of 5</div>
          <h2 className="page-title">Ally is reading…</h2>
          <img src="/ally.png" alt="Ally" style={{ width: 72, height: 72, objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(30,42,61,0.18))", marginBottom: 16 }} />

          <div className="semester-overall-bar-wrap">
            <div className="slider-row">
              <div className="slider-row__label" style={{ width: "auto", flex: 1 }}>Overall progress</div>
              <div className="slider-row__value">75%</div>
            </div>
            <div className="slider-row__track" style={{ margin: "6px 0 16px" }}>
              <div className="slider-row__fill" style={{ width: "75%" }} />
            </div>
          </div>

          <div className="semester-file-list">
            {MOCK_FILES.map((f, i) => (
              <div key={i} className="semester-file-row">
                <div className={`semester-file-icon semester-file-icon--${f.status}`} />
                <div style={{ flex: 1 }}>
                  <div className="semester-file-name">{f.name}</div>
                  <div className="slider-row__track" style={{ marginTop: 4, height: 4 }}>
                    <div className="slider-row__fill" style={{
                      width: f.status === "done" ? "100%" : f.status === "reading" ? "50%" : "0%"
                    }} />
                  </div>
                </div>
                <div className="semester-file-size">
                  {f.status === "done" ? "Done" : f.status === "reading" ? "Reading…" : "Waiting"}
                </div>
              </div>
            ))}
          </div>

          <div className="semester-panel__actions">
            <button className="btn" type="button" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn--primary" type="button" onClick={() => setStep(3)}>
              Calibrate →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="semester-panel">
          <div className="page-eyebrow">Add semester · Step 3 of 5</div>
          <h2 className="page-title">Help Ally calibrate.</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
            Rate each subject by how confident you feel and how much the grade matters.
          </p>

          {SUBJECTS_CALIB.map((s, si) => (
            <div key={si} className="semester-calib-card">
              <div className="semester-calib-bar" style={{ background: s.color }} />
              <div className="semester-calib-name">{s.name}</div>
              <div className="settings-sliders">
                <div className="slider-row">
                  <div className="slider-row__label">Confidence</div>
                  <div className="slider-row__track">
                    <div className="slider-row__fill" style={{ width: "40%" }} />
                    <div className="slider-row__thumb" style={{ left: "40%" }} />
                  </div>
                  <div className="slider-row__value">Low</div>
                </div>
                <div className="slider-row">
                  <div className="slider-row__label">Grade stakes</div>
                  <div className="slider-row__track">
                    <div className="slider-row__fill" style={{ width: "70%" }} />
                    <div className="slider-row__thumb" style={{ left: "70%" }} />
                  </div>
                  <div className="slider-row__value">High</div>
                </div>
                <div className="slider-row">
                  <div className="slider-row__label">Weekly hours</div>
                  <div className="slider-row__track">
                    <div className="slider-row__fill" style={{ width: "50%" }} />
                    <div className="slider-row__thumb" style={{ left: "50%" }} />
                  </div>
                  <div className="slider-row__value">5h</div>
                </div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 8 }}>
            <div className="semester-calib-name" style={{ marginBottom: 8 }}>Off days</div>
            <div className="semester-offdays">
              {OFF_DAYS.map(d => (
                <button
                  key={d}
                  type="button"
                  className={`semester-offday${offDays.has(d) ? " semester-offday--on" : ""}`}
                  onClick={() => toggleDay(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="semester-panel__actions">
            <button className="btn" type="button" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn--primary" type="button" onClick={() => setStep(4)}>
              Generate plan →
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="semester-panel">
          <div className="page-eyebrow">Add semester · Step 4 of 5</div>
          <h2 className="page-title">Here's your plan.</h2>

          <div className="semester-plan-stats">
            <div className="subject-detail__mini-stat">
              <div className="subject-detail__mini-value">4</div>
              <div className="subject-detail__mini-label">Subjects</div>
            </div>
            <div className="subject-detail__mini-stat">
              <div className="subject-detail__mini-value">14h</div>
              <div className="subject-detail__mini-label">Per week</div>
            </div>
            <div className="subject-detail__mini-stat">
              <div className="subject-detail__mini-value">May–Jun</div>
              <div className="subject-detail__mini-label">Semester</div>
            </div>
          </div>

          <div className="semester-week-list">
            {PLAN_WEEKS.map((w, i) => (
              <div key={i} className={`semester-week-row${w.updated ? " semester-week-row--updated" : ""}`}>
                <div className="semester-week-label">{w.label}</div>
                <div className="semester-week-entries">
                  {w.entries.map((e, j) => (
                    <span key={j} className="sticker sticker--panel" style={{ fontSize: 11 }}>{e}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="semester-panel__actions">
            <button className="btn" type="button" onClick={() => setStep(3)}>← Tweak</button>
            <button className="btn" type="button" onClick={() => setStep(3)}>Regenerate</button>
            <button className="btn btn--primary" type="button" onClick={() => setStep(5)}>
              Approve →
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="semester-final">
          <div className="semester-final__left">
            <div className="page-eyebrow">Add semester · Step 5 of 5</div>
            <h2 className="page-title" style={{ marginBottom: 16 }}>Plan is locked in.</h2>
            <div className="semester-week-list" style={{ maxHeight: 340, overflowY: "auto" }}>
              {PLAN_WEEKS.map((w, i) => (
                <div key={i} className={`semester-week-row${i === 1 ? " semester-week-row--updated" : ""}`}>
                  <div className="semester-week-label">{w.label}</div>
                  <div className="semester-week-entries">
                    {w.entries.map((e, j) => (
                      <span key={j} className="sticker sticker--panel" style={{ fontSize: 11 }}>{e}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn--primary" type="button" onClick={onDone} style={{ marginTop: 14 }}>
              Let's go →
            </button>
          </div>

          <div className="semester-final__right">
            <div className="semester-chat">
              <div className="semester-chat__messages">
                {CHAT_MSGS.map((m, i) => (
                  <div key={i} className={`semester-chat__msg semester-chat__msg--${m.from}`}>
                    {m.from === "ally" && <img src="/ally.png" alt="Ally" className="semester-chat__ally-avatar" />}
                    <div className="semester-chat__bubble">{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="semester-chat__composer">
                <input
                  className="semester-chat__input"
                  placeholder="Ask Ally to adjust…"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                />
                <button className="btn btn--primary btn--sm" type="button">Send</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
