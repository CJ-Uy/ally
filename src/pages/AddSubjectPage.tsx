import { useState } from "react";

type AddSubjectProps = { onBack: () => void; onAddSemester: () => void };

export function AddSubjectPage({ onBack, onAddSemester }: AddSubjectProps) {
  const [mode, setMode] = useState<"drop" | "manual">("drop");

  return (
    <div className="add-subject">
      <div className="page-header">
        <div>
          <button className="btn btn--sm" type="button" onClick={onBack} style={{ marginBottom: 8 }}>
            ← Back
          </button>
          <div className="page-eyebrow">Subjects</div>
          <h2 className="page-title">Add a subject</h2>
        </div>
      </div>

      <div className="add-subject__modes">
        <button
          type="button"
          className={`add-subject__mode-tab${mode === "drop" ? " add-subject__mode-tab--active" : ""}`}
          onClick={() => setMode("drop")}
        >
          Upload syllabus
        </button>
        <button
          type="button"
          className={`add-subject__mode-tab${mode === "manual" ? " add-subject__mode-tab--active" : ""}`}
          onClick={() => setMode("manual")}
        >
          Add manually
        </button>
      </div>

      {mode === "drop" ? (
        <>
          <div className="add-subject__drop-zone">
            <div className="add-subject__drop-icon">↑</div>
            <div className="add-subject__drop-label">Drop your syllabus here</div>
            <div className="add-subject__drop-formats">PDF · DOCX · IMAGE · TXT</div>
            <button className="btn" type="button" style={{ marginTop: 12 }}>
              Browse files
            </button>
          </div>
          <div className="add-subject__or">
            <span>or</span>
          </div>
          <button className="btn add-subject__semester-btn" type="button" onClick={onAddSemester}>
            Add full semester at once →
          </button>
        </>
      ) : (
        <div className="add-subject__form">
          <div className="add-subject__field">
            <label className="add-subject__field-label">Subject name</label>
            <input className="add-subject__input" placeholder="e.g. Linear Algebra" type="text" />
          </div>
          <div className="add-subject__field">
            <label className="add-subject__field-label">Chapter / unit count</label>
            <input className="add-subject__input" placeholder="e.g. 7 chapters" type="text" />
          </div>
          <div className="add-subject__field">
            <label className="add-subject__field-label">Upcoming deadline</label>
            <input className="add-subject__input" placeholder="e.g. Exam on June 15" type="text" />
          </div>
          <div className="add-subject__field">
            <label className="add-subject__field-label">Color tag</label>
            <div className="add-subject__colors">
              {["var(--sky)", "var(--sage)", "var(--butter)", "var(--blush)", "var(--fox)"].map((c, i) => (
                <button
                  key={i}
                  type="button"
                  className={`add-subject__color-dot${i === 0 ? " add-subject__color-dot--active" : ""}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <button className="btn btn--primary" type="button">
            Add subject →
          </button>
        </div>
      )}
    </div>
  );
}
