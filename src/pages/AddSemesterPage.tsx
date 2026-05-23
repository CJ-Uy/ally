import { useMemo, useState } from "react";
import { refreshAll, useProfile } from "../data/store";

interface SubjectDraft {
  id: string;
  name: string;
  pdfPath: string | null;
  subjectId?: number;
  status: "pending" | "parsing" | "parsed" | "skipped" | "error";
  result?: SyllabusParseResult;
  errorMessage?: string;
}

function newDraft(name = ""): SubjectDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    pdfPath: null,
    status: "pending",
  };
}

type Step = 1 | 2 | 3 | 4 | 5;

type AddSemesterProps = { onBack: () => void; onDone: () => void };

export function AddSemesterPage({ onBack, onDone }: AddSemesterProps) {
  const [profile] = useProfile();
  const level = profile?.educationLevel ?? "college";

  const [step, setStep] = useState<Step>(1);
  const [drafts, setDrafts] = useState<SubjectDraft[]>([newDraft(""), newDraft(""), newDraft("")]);
  const [error, setError] = useState<string | null>(null);

  const validDrafts = useMemo(
    () => drafts.filter((d) => d.name.trim().length > 0),
    [drafts],
  );

  const parsedDrafts = useMemo(
    () => drafts.filter((d) => d.status === "parsed"),
    [drafts],
  );

  const setDraft = (id: string, patch: Partial<SubjectDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };
  const addDraft = () => setDrafts((d) => [...d, newDraft()]);
  const removeDraft = (id: string) => setDrafts((d) => d.filter((x) => x.id !== id));

  const pickPdf = async (id: string) => {
    if (!window.api?.syllabusPickPdf) return;
    try {
      const path = await window.api.syllabusPickPdf();
      if (path) setDraft(id, { pdfPath: path });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pick file");
    }
  };

  const runParse = async () => {
    if (!window.api?.subjectsCreate || !window.api.syllabusParseAndApply) return;
    setStep(2);
    setError(null);

    const work = validDrafts;
    const updated: SubjectDraft[] = [];
    for (const d of work) {
      try {
        const subj = await window.api.subjectsCreate({
          name: d.name.trim(),
          educationLevel: level,
        });
        updated.push({ ...d, subjectId: subj.id });
      } catch (err) {
        updated.push({
          ...d,
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Could not create subject",
        });
      }
    }
    setDrafts((prev) => prev.map((d) => updated.find((u) => u.id === d.id) ?? d));

    for (const d of updated) {
      if (d.status === "error" || !d.subjectId) continue;
      if (!d.pdfPath) {
        setDraft(d.id, { status: "skipped" });
        continue;
      }
      setDraft(d.id, { status: "parsing" });
      try {
        const result = await window.api.syllabusParseAndApply(d.subjectId, d.pdfPath);
        setDraft(d.id, { status: "parsed", result });
      } catch (err) {
        setDraft(d.id, {
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Parse failed",
        });
      }
    }
    refreshAll();
    setStep(3);
  };

  return (
    <div className="add-semester">
      <div className="semester-steps">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`semester-step${step >= n ? " semester-step--done" : ""}${step === n ? " semester-step--active" : ""}`}
          >
            {n}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="semester-panel">
          <div className="page-eyebrow">Add semester · Step 1 of 5</div>
          <h2 className="page-title">Name your subjects.</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
            Add every subject you're taking this semester. You can attach syllabus PDFs next.
          </p>

          <div className="semester-file-list">
            {drafts.map((d, i) => (
              <div key={d.id} className="semester-file-row">
                <div className="semester-file-icon semester-file-icon--pending">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <input
                  className="add-subject__input"
                  placeholder="Subject name"
                  value={d.name}
                  onChange={(e) => setDraft(d.id, { name: e.target.value })}
                  style={{ flex: 1, marginRight: 8 }}
                />
                {drafts.length > 1 && (
                  <button className="btn btn--sm" type="button" onClick={() => removeDraft(d.id)} aria-label="Remove">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button type="button" className="btn btn--sm" style={{ marginTop: 12 }} onClick={addDraft}>
            + Add another subject
          </button>

          <div className="semester-panel__actions">
            <button className="btn" type="button" onClick={onBack}>← Back</button>
            <button
              className="btn btn--primary"
              type="button"
              disabled={validDrafts.length === 0}
              onClick={() => setStep(2)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="semester-panel">
          <div className="page-eyebrow">Add semester · Step 2 of 5</div>
          <h2 className="page-title">Attach syllabus PDFs.</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
            Skip any subject you don't have a PDF for — you can add it later.
          </p>

          <div className="semester-file-list">
            {validDrafts.map((d) => (
              <div key={d.id} className="semester-file-row">
                <div className="semester-file-icon semester-file-icon--pending" />
                <div className="semester-file-name" style={{ flex: 1 }}>{d.name}</div>
                {d.pdfPath ? (
                  <>
                    <span className="semester-file-size">{d.pdfPath.split(/[\\/]/).pop()}</span>
                    <button type="button" className="btn btn--sm" onClick={() => setDraft(d.id, { pdfPath: null })}>
                      Change
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn--sm" onClick={() => void pickPdf(d.id)}>
                    Choose PDF
                  </button>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="sticker sticker--blush" style={{ alignSelf: "flex-start", marginTop: 12 }}>
              {error}
            </div>
          )}

          <div className="semester-panel__actions">
            <button className="btn" type="button" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn--primary" type="button" onClick={() => void runParse()}>
              Parse syllabi →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="semester-panel">
          <div className="page-eyebrow">Add semester · Step 3 of 5</div>
          <h2 className="page-title">{parsedDrafts.length > 0 ? "Here's what we found." : "Reading…"}</h2>

          <div className="semester-file-list">
            {validDrafts.map((d) => (
              <div key={d.id} className={`semester-file-row semester-file-row--${d.status}`}>
                <div className={`semester-file-icon semester-file-icon--${d.status === "parsed" ? "done" : d.status === "parsing" ? "reading" : "pending"}`} />
                <div className="semester-file-name" style={{ flex: 1 }}>{d.name}</div>
                <div className="semester-file-size">
                  {d.status === "pending" && "queued"}
                  {d.status === "parsing" && "reading…"}
                  {d.status === "parsed" &&
                    `${d.result?.deadlinesCreated ?? 0} tasks · ${d.result?.eventsCreated ?? 0} exams`}
                  {d.status === "skipped" && "no PDF"}
                  {d.status === "error" && (d.errorMessage ?? "failed")}
                </div>
              </div>
            ))}
          </div>

          <div className="semester-panel__actions">
            <button className="btn" type="button" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn--primary" type="button" onClick={() => setStep(4)}>
              Review plan →
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="semester-panel">
          <div className="page-eyebrow">Add semester · Step 4 of 5</div>
          <h2 className="page-title">Here's your semester.</h2>

          <div className="semester-plan-stats">
            <div className="subject-detail__mini-stat">
              <div className="subject-detail__mini-value">{validDrafts.length}</div>
              <div className="subject-detail__mini-label">Subjects</div>
            </div>
            <div className="subject-detail__mini-stat">
              <div className="subject-detail__mini-value">
                {parsedDrafts.reduce((sum, d) => sum + (d.result?.deadlinesCreated ?? 0), 0)}
              </div>
              <div className="subject-detail__mini-label">Tasks created</div>
            </div>
            <div className="subject-detail__mini-stat">
              <div className="subject-detail__mini-value">
                {parsedDrafts.reduce((sum, d) => sum + (d.result?.eventsCreated ?? 0), 0)}
              </div>
              <div className="subject-detail__mini-label">Events</div>
            </div>
          </div>

          <div className="semester-week-list" style={{ marginTop: 20 }}>
            {parsedDrafts.map((d) => (
              <div key={d.id} className="semester-week-row">
                <div className="semester-week-label">{d.name}</div>
                <div className="semester-week-entries">
                  {(d.result?.parsed.gradingBreakdown ?? []).slice(0, 4).map((g, i) => (
                    <span key={i} className="sticker sticker--panel" style={{ fontSize: 11 }}>
                      {g.component} · {g.weightPercent}%
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="semester-panel__actions">
            <button className="btn" type="button" onClick={() => setStep(3)}>← Back</button>
            <button className="btn btn--primary" type="button" onClick={() => setStep(5)}>
              Looks good →
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="semester-panel" style={{ textAlign: "center" }}>
          <div className="page-eyebrow">Add semester · Done</div>
          <h2 className="page-title" style={{ marginBottom: 16 }}>Plan is locked in.</h2>
          <img src="/ally.png" alt="Ally" style={{ width: 88, height: 88, objectFit: "contain", margin: "8px auto 16px", filter: "drop-shadow(0 6px 14px rgba(30,42,61,0.2))" }} />
          <p style={{ color: "var(--ink-soft)", fontSize: 14, maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.5 }}>
            Your subjects are saved and the calendar is filled in. Start whenever you're ready.
          </p>
          <button className="btn btn--primary" type="button" onClick={onDone}>
            Let's go →
          </button>
        </div>
      )}
    </div>
  );
}
