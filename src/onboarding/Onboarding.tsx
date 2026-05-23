import { useMemo, useState } from "react";
import { refreshAll } from "../data/store";
import "./Onboarding.css";

type Step = "intro" | "hours" | "level" | "subjects" | "uploads" | "parsing" | "review" | "done";

interface SubjectDraft {
  id: string;
  name: string;
  pdfPath: string | null;
  subjectId?: number;
  status: "pending" | "parsing" | "parsed" | "skipped" | "error";
  result?: SyllabusParseResult;
  errorMessage?: string;
}

const STEP_ORDER: Step[] = ["intro", "hours", "level", "subjects", "uploads", "parsing", "review", "done"];

function newDraft(name = ""): SubjectDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    pdfPath: null,
    status: "pending",
  };
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("intro");
  const [hours, setHours] = useState<number>(15);
  const [level, setLevel] = useState<"high_school" | "college">("college");
  const [drafts, setDrafts] = useState<SubjectDraft[]>([
    newDraft(""),
    newDraft(""),
    newDraft(""),
  ]);
  const [error, setError] = useState<string | null>(null);

  const idx = STEP_ORDER.indexOf(step);
  const progress = ((idx + 1) / STEP_ORDER.length) * 100;

  const validDrafts = useMemo(
    () => drafts.filter((d) => d.name.trim().length > 0),
    [drafts],
  );

  const next = () => {
    setError(null);
    const i = STEP_ORDER.indexOf(step);
    if (i < STEP_ORDER.length - 1) setStep(STEP_ORDER[i + 1]);
  };
  const back = () => {
    const i = STEP_ORDER.indexOf(step);
    if (i > 0) setStep(STEP_ORDER[i - 1]);
  };

  const setDraft = (id: string, patch: Partial<SubjectDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const addDraft = () => setDrafts((d) => [...d, newDraft()]);
  const removeDraft = (id: string) =>
    setDrafts((d) => d.filter((x) => x.id !== id));

  const pickPdf = async (id: string) => {
    try {
      const path = await window.api.syllabusPickPdf();
      if (path) setDraft(id, { pdfPath: path });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pick file");
    }
  };

  const startParsing = async () => {
    setStep("parsing");
    setError(null);

    const work = validDrafts;
    // Create subjects first so we have IDs.
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
    setDrafts((prev) =>
      prev.map((d) => updated.find((u) => u.id === d.id) ?? d),
    );

    // Parse PDFs sequentially so we don't hammer the Gemini quota.
    for (const d of updated) {
      if (d.status === "error" || !d.subjectId) continue;
      if (!d.pdfPath) {
        setDraft(d.id, { status: "skipped" });
        continue;
      }
      setDraft(d.id, { status: "parsing" });
      try {
        const result = await window.api.syllabusParseAndApply(
          d.subjectId,
          d.pdfPath,
        );
        setDraft(d.id, { status: "parsed", result });
      } catch (err) {
        setDraft(d.id, {
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Parse failed",
        });
      }
    }

    setStep("review");
  };

  const finish = async () => {
    try {
      await window.api.profileSave({
        studyHoursPerWeek: hours,
        educationLevel: level,
      });
      refreshAll();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    }
  };

  return (
    <div className="onb">
      <div className="onb__paper">
        <header className="onb__head">
          <div className="onb__brand">
            <span className="onb__mark">A</span>
            <span className="onb__brandtext">Ally</span>
          </div>
          <div className="onb__progress">
            <span className="eyebrow">
              Step {idx + 1} <span className="onb__progress-of">of {STEP_ORDER.length}</span>
            </span>
            <div className="onb__bar">
              <div className="onb__bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        <div className="onb__stage">
          {step === "intro" && (
            <section className="onb__panel">
              <p className="eyebrow">A study companion</p>
              <h1 className="display onb__title">
                Let's plan your <em>semester</em>.
              </h1>
              <p className="onb__lede">
                Drop in your syllabi and Ally will read them, pull out every
                deadline and exam, and assemble a calendar you can actually
                work from. Takes about three minutes.
              </p>
              <div className="onb__cards">
                <div className="onb__card">
                  <span className="onb__cardnum">01</span>
                  <p>Tell us your weekly study hours and education level.</p>
                </div>
                <div className="onb__card">
                  <span className="onb__cardnum">02</span>
                  <p>List your subjects and upload any syllabi you have.</p>
                </div>
                <div className="onb__card">
                  <span className="onb__cardnum">03</span>
                  <p>Confirm what we extracted — then dive in.</p>
                </div>
              </div>
              <div className="onb__actions">
                <button className="accent" onClick={next}>
                  Begin →
                </button>
              </div>
            </section>
          )}

          {step === "hours" && (
            <section className="onb__panel">
              <p className="eyebrow">Question one</p>
              <h2 className="display onb__title onb__title--mid">
                How many hours a week can you realistically study?
              </h2>
              <p className="onb__hint">
                Be honest. Aspirational numbers make for broken plans.
              </p>
              <div className="onb__hours">
                <input
                  type="range"
                  min={3}
                  max={50}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="onb__range"
                />
                <div className="onb__hours-readout">
                  <span className="onb__hours-num">{hours}</span>
                  <span className="onb__hours-unit">hrs / week</span>
                </div>
              </div>
              <div className="onb__chips">
                {[5, 10, 15, 20, 30, 40].map((h) => (
                  <button
                    key={h}
                    className={`onb__chip ${hours === h ? "is-active" : ""}`}
                    onClick={() => setHours(h)}
                  >
                    {h}
                  </button>
                ))}
              </div>
              <div className="onb__actions">
                <button className="ghost" onClick={back}>
                  ← Back
                </button>
                <button className="accent" onClick={next}>
                  Next →
                </button>
              </div>
            </section>
          )}

          {step === "level" && (
            <section className="onb__panel">
              <p className="eyebrow">Question two</p>
              <h2 className="display onb__title onb__title--mid">
                What level of school are you in?
              </h2>
              <div className="onb__levels">
                <button
                  className={`onb__level ${level === "high_school" ? "is-active" : ""}`}
                  onClick={() => setLevel("high_school")}
                >
                  <span className="onb__level-num">01</span>
                  <span className="display onb__level-title">High school</span>
                  <span className="onb__level-sub">
                    Shorter classes, weekly homework cadence.
                  </span>
                </button>
                <button
                  className={`onb__level ${level === "college" ? "is-active" : ""}`}
                  onClick={() => setLevel("college")}
                >
                  <span className="onb__level-num">02</span>
                  <span className="display onb__level-title">College</span>
                  <span className="onb__level-sub">
                    Heavier units, midterms & finals weighting.
                  </span>
                </button>
              </div>
              <div className="onb__actions">
                <button className="ghost" onClick={back}>
                  ← Back
                </button>
                <button className="accent" onClick={next}>
                  Next →
                </button>
              </div>
            </section>
          )}

          {step === "subjects" && (
            <section className="onb__panel">
              <p className="eyebrow">Question three</p>
              <h2 className="display onb__title onb__title--mid">
                Name the subjects you're taking.
              </h2>
              <p className="onb__hint">
                Whatever you'd call them out loud — "Calc II", "World Lit",
                "AP Bio".
              </p>
              <div className="onb__subjects">
                {drafts.map((d, i) => (
                  <div key={d.id} className="onb__subjectrow">
                    <span className="onb__subjectnum">{String(i + 1).padStart(2, "0")}</span>
                    <input
                      placeholder={
                        ["Linear Algebra", "Modern History", "Organic Chem"][i] ?? "Subject name"
                      }
                      value={d.name}
                      onChange={(e) => setDraft(d.id, { name: e.target.value })}
                      className="onb__subjectinput"
                    />
                    {drafts.length > 1 && (
                      <button
                        className="onb__remove"
                        title="Remove"
                        onClick={() => removeDraft(d.id)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button className="ghost onb__addsubject" onClick={addDraft}>
                  + Add another subject
                </button>
              </div>
              <div className="onb__actions">
                <button className="ghost" onClick={back}>
                  ← Back
                </button>
                <button
                  className="accent"
                  disabled={validDrafts.length === 0}
                  onClick={next}
                >
                  Next →
                </button>
              </div>
            </section>
          )}

          {step === "uploads" && (
            <section className="onb__panel">
              <p className="eyebrow">Question four</p>
              <h2 className="display onb__title onb__title--mid">
                Attach the syllabus PDF for each subject.
              </h2>
              <p className="onb__hint">
                Skip any subject you don't have a PDF for — you can add it
                later.
              </p>
              <div className="onb__uploads">
                {validDrafts.map((d) => (
                  <div key={d.id} className="onb__uploadrow">
                    <div className="onb__uploadname">
                      <span className="display">{d.name}</span>
                    </div>
                    <div className="onb__uploadcontrol">
                      {d.pdfPath ? (
                        <div className="onb__file">
                          <span className="onb__filename">
                            {d.pdfPath.split(/[\\/]/).pop()}
                          </span>
                          <button
                            className="ghost"
                            onClick={() => setDraft(d.id, { pdfPath: null })}
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <button className="ghost" onClick={() => pickPdf(d.id)}>
                          Choose PDF
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="onb__actions">
                <button className="ghost" onClick={back}>
                  ← Back
                </button>
                <button className="accent" onClick={startParsing}>
                  Parse syllabi →
                </button>
              </div>
            </section>
          )}

          {step === "parsing" && (
            <section className="onb__panel onb__panel--centered">
              <p className="eyebrow">Reading your syllabi</p>
              <h2 className="display onb__title onb__title--mid">
                Just a moment. Ally is reading.
              </h2>
              <ul className="onb__parsing">
                {drafts
                  .filter((d) => d.name.trim().length > 0)
                  .map((d) => (
                    <li key={d.id} className={`onb__parsing-row is-${d.status}`}>
                      <span className="display onb__parsing-name">{d.name}</span>
                      <span className="onb__parsing-status">
                        {d.status === "pending" && "queued"}
                        {d.status === "parsing" && "reading…"}
                        {d.status === "parsed" &&
                          `${d.result?.deadlinesCreated ?? 0} tasks · ${d.result?.eventsCreated ?? 0} exams`}
                        {d.status === "skipped" && "skipped"}
                        {d.status === "error" && (d.errorMessage ?? "failed")}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          )}

          {step === "review" && (
            <section className="onb__panel">
              <p className="eyebrow">Here's what we found</p>
              <h2 className="display onb__title onb__title--mid">
                Confirm and we'll save it.
              </h2>
              <div className="onb__review">
                {drafts
                  .filter((d) => d.name.trim().length > 0)
                  .map((d) => (
                    <article key={d.id} className="onb__reviewcard">
                      <header className="onb__reviewhead">
                        <span className="display onb__reviewname">{d.name}</span>
                        {d.result?.parsed.difficulty && (
                          <span
                            className={`onb__diff onb__diff--${d.result.parsed.difficulty}`}
                          >
                            {d.result.parsed.difficulty}
                          </span>
                        )}
                      </header>
                      {d.status === "parsed" && d.result ? (
                        <div className="onb__reviewbody">
                          <p className="onb__reviewstats">
                            <strong>{d.result.deadlinesCreated}</strong> tasks ·{" "}
                            <strong>{d.result.eventsCreated}</strong> exams ·{" "}
                            <strong>{d.result.parsed.topics.length}</strong> topics
                          </p>
                          {d.result.parsed.gradingBreakdown.length > 0 && (
                            <div className="onb__grading">
                              {d.result.parsed.gradingBreakdown.map((g, i) => (
                                <span key={i} className="onb__grade">
                                  {g.component} <em>{g.weightPercent}%</em>
                                </span>
                              ))}
                            </div>
                          )}
                          {d.result.parsed.deadlines.length > 0 && (
                            <ul className="onb__deadlines">
                              {d.result.parsed.deadlines.slice(0, 4).map((dl, i) => (
                                <li key={i}>
                                  <span>{dl.title}</span>
                                  <span className="onb__deadlinedate">{dl.dueDate}</span>
                                </li>
                              ))}
                              {d.result.parsed.deadlines.length > 4 && (
                                <li className="onb__deadlinemore">
                                  + {d.result.parsed.deadlines.length - 4} more
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      ) : d.status === "skipped" ? (
                        <p className="onb__reviewskip">
                          No syllabus uploaded — empty subject created.
                        </p>
                      ) : d.status === "error" ? (
                        <p className="onb__reviewerror">{d.errorMessage}</p>
                      ) : null}
                    </article>
                  ))}
              </div>
              <div className="onb__actions">
                <button className="ghost" onClick={() => setStep("uploads")}>
                  ← Adjust
                </button>
                <button className="accent" onClick={finish}>
                  Save plan →
                </button>
              </div>
            </section>
          )}
        </div>

        {error && <p className="onb__error">{error}</p>}

        <footer className="onb__foot">
          <span className="onb__footnote">
            Ally · KPMG Academic Innovation Challenge 2026
          </span>
        </footer>
      </div>
    </div>
  );
}
