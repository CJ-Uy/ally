import { useState } from "react";
import { refreshAll, useProfile } from "../data/store";

const SUBJECT_COLOR_OPTIONS = [
  "var(--sky)",
  "var(--sage)",
  "var(--butter)",
  "var(--blush)",
  "var(--fox)",
];

type AddSubjectProps = { onBack: () => void; onAddSemester: () => void };

export function AddSubjectPage({ onBack, onAddSemester }: AddSubjectProps) {
  const [mode, setMode] = useState<"upload" | "manual">("upload");
  const [profile] = useProfile();
  const fallbackLevel = profile?.educationLevel ?? "college";

  const [pickedPath, setPickedPath] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [educationLevel, setEducationLevel] = useState<string>(fallbackLevel);
  const [colorIdx, setColorIdx] = useState(0);

  const [status, setStatus] = useState<"idle" | "working" | "error" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<SyllabusParseResult | null>(null);

  const pickPdf = async () => {
    if (!window.api?.syllabusPickPdf) return;
    setMessage(null);
    try {
      const path = await window.api.syllabusPickPdf();
      if (path) setPickedPath(path);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not pick file");
    }
  };

  const submitUpload = async () => {
    if (!window.api?.subjectsCreate || !window.api.syllabusParseAndApply) return;
    if (!subjectName.trim()) {
      setMessage("Please give the subject a name.");
      return;
    }
    if (!pickedPath) {
      setMessage("Please choose a syllabus PDF first.");
      return;
    }
    setStatus("working");
    setMessage(null);
    try {
      const subject = await window.api.subjectsCreate({
        name: subjectName.trim(),
        educationLevel,
      });
      const parsed = await window.api.syllabusParseAndApply(subject.id, pickedPath);
      setResult(parsed);
      setStatus("done");
      refreshAll();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to add subject");
    }
  };

  const submitManual = async () => {
    if (!window.api?.subjectsCreate) return;
    if (!subjectName.trim()) {
      setMessage("Please give the subject a name.");
      return;
    }
    setStatus("working");
    setMessage(null);
    try {
      await window.api.subjectsCreate({
        name: subjectName.trim(),
        educationLevel,
      });
      refreshAll();
      setStatus("done");
      setResult(null);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to add subject");
    }
  };

  if (status === "done") {
    return (
      <div className="add-subject">
        <div className="page-header">
          <div>
            <button className="btn btn--sm" type="button" onClick={onBack} style={{ marginBottom: 8 }}>
              ← Back to subjects
            </button>
            <div className="page-eyebrow">Subject added</div>
            <h2 className="page-title">{subjectName} is in.</h2>
          </div>
        </div>

        {result && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card__title">Imported from syllabus</div>
            <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
              <div style={{ display: "flex", gap: 16, color: "var(--ink-soft)", fontSize: 14 }}>
                <span><strong>{result.deadlinesCreated}</strong> tasks</span>
                <span><strong>{result.eventsCreated}</strong> events</span>
                <span><strong>{result.parsed.topics.length}</strong> topics</span>
              </div>
              {result.parsed.gradingBreakdown.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.parsed.gradingBreakdown.map((g, i) => (
                    <span key={i} className="sticker sticker--panel">
                      {g.component} · {g.weightPercent}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn btn--primary" type="button" onClick={onBack}>
            See all subjects →
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setStatus("idle");
              setPickedPath(null);
              setSubjectName("");
              setResult(null);
              setMessage(null);
            }}
          >
            Add another
          </button>
        </div>
      </div>
    );
  }

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
          className={`add-subject__mode-tab${mode === "upload" ? " add-subject__mode-tab--active" : ""}`}
          onClick={() => setMode("upload")}
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

      <div className="add-subject__form">
        <div className="add-subject__field">
          <label className="add-subject__field-label">Subject name</label>
          <input
            className="add-subject__input"
            placeholder="e.g. Linear Algebra"
            type="text"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
          />
        </div>

        <div className="add-subject__field">
          <label className="add-subject__field-label">Education level</label>
          <select
            className="add-subject__input"
            value={educationLevel}
            onChange={(e) => setEducationLevel(e.target.value)}
          >
            <option value="high_school">High school</option>
            <option value="college">College</option>
          </select>
        </div>

        <div className="add-subject__field">
          <label className="add-subject__field-label">Color tag</label>
          <div className="add-subject__colors">
            {SUBJECT_COLOR_OPTIONS.map((c, i) => (
              <button
                key={c}
                type="button"
                className={`add-subject__color-dot${i === colorIdx ? " add-subject__color-dot--active" : ""}`}
                style={{ background: c }}
                onClick={() => setColorIdx(i)}
                aria-label={`Color option ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {mode === "upload" && (
          <div className="add-subject__drop-zone" style={{ marginTop: 4 }}>
            {pickedPath ? (
              <>
                <div className="add-subject__drop-label">
                  {pickedPath.split(/[\\/]/).pop()}
                </div>
                <div className="add-subject__drop-formats">Ready to parse</div>
                <button className="btn btn--sm" type="button" style={{ marginTop: 12 }} onClick={() => setPickedPath(null)}>
                  Change
                </button>
              </>
            ) : (
              <>
                <div className="add-subject__drop-icon">↑</div>
                <div className="add-subject__drop-label">Choose a syllabus PDF</div>
                <div className="add-subject__drop-formats">PDF only</div>
                <button className="btn" type="button" style={{ marginTop: 12 }} onClick={() => void pickPdf()}>
                  Browse files
                </button>
              </>
            )}
          </div>
        )}

        {message && (
          <div className="sticker sticker--blush" style={{ alignSelf: "flex-start" }}>
            {message}
          </div>
        )}

        <button
          type="button"
          className="btn btn--primary"
          disabled={status === "working"}
          onClick={() => (mode === "upload" ? void submitUpload() : void submitManual())}
        >
          {status === "working"
            ? "Working…"
            : mode === "upload"
              ? "Parse & add →"
              : "Add subject →"}
        </button>

        {mode === "upload" && (
          <>
            <div className="add-subject__or"><span>or</span></div>
            <button className="btn add-subject__semester-btn" type="button" onClick={onAddSemester}>
              Add full semester at once →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
