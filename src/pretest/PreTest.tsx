import { useEffect, useState } from "react";
import "./PreTest.css";

type Question = PreTestQuestionDto;

interface Props {
  subjectId: number;
  subjectName: string;
  onDone: (result: { subjectId: number; familiarity: SubjectFamiliarity }) => void;
  onSkip?: () => void;
}

type Phase = "loading" | "asking" | "submitting" | "result" | "error";

export function PreTest({ subjectId, subjectName, onDone, onSkip }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<SubjectFamiliarity | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    setErrorMsg(null);
    void (async () => {
      try {
        const payload = await window.api.preTestGenerate(subjectId);
        if (cancelled) return;
        setQuestions(payload.questions);
        setPhase(payload.questions.length > 0 ? "asking" : "error");
        if (payload.questions.length === 0) {
          setErrorMsg("No questions came back from the agent.");
        }
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Could not generate questions");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);

  const submit = async () => {
    setPhase("submitting");
    try {
      const submission = await window.api.preTestSubmit({
        subjectId,
        questions,
        answers: questions.map((_, i) => ({
          questionIndex: i,
          choiceIndex: answers[i],
        })),
      });
      setResult(submission.familiarity);
      setPhase("result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not save familiarity");
      setPhase("error");
    }
  };

  return (
    <div className="pretest">
      <header className="pretest__head">
        <span className="eyebrow">Familiarity check-in</span>
        <h2 className="display pretest__title">
          A few quick questions on <em>{subjectName}</em>.
        </h2>
        <p className="pretest__lede">
          Not a test — just so Ally knows whether to pad your study estimates
          or trim them.
        </p>
      </header>

      {phase === "loading" && (
        <p className="pretest__quiet">Writing your check-in…</p>
      )}

      {phase === "error" && (
        <div className="pretest__error">
          <p>{errorMsg ?? "Something went wrong."}</p>
          {onSkip && (
            <button className="ghost" onClick={onSkip}>
              Skip
            </button>
          )}
        </div>
      )}

      {(phase === "asking" || phase === "submitting") && (
        <ol className="pretest__list">
          {questions.map((q, i) => (
            <li key={i} className="pretest__q">
              <div className="pretest__qhead">
                <span className="pretest__qnum">{String(i + 1).padStart(2, "0")}</span>
                <span className="pretest__qprompt">{q.prompt}</span>
                <span className={`pretest__band pretest__band--${q.band}`}>
                  {q.band}
                </span>
              </div>
              <div className="pretest__choices">
                {q.choices.map((c, ci) => (
                  <button
                    key={ci}
                    className={`pretest__choice ${
                      answers[i] === ci ? "is-selected" : ""
                    }`}
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [i]: ci }))
                    }
                    disabled={phase === "submitting"}
                  >
                    <span className="pretest__choicemark">
                      {String.fromCharCode(65 + ci)}
                    </span>
                    <span>{c}</span>
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}

      {phase === "result" && result && (
        <div className="pretest__result">
          <span className={`pretest__resultchip is-${result}`}>{result}</span>
          <p className="pretest__resultcopy">
            {result === "confident" &&
              `You know ${subjectName} well — Ally will tighten its time estimates.`}
            {result === "familiar" &&
              `You've got a working grip on ${subjectName} — estimates stay as-is.`}
            {result === "beginner" &&
              `New territory for you — Ally will give ${subjectName} tasks a bit more breathing room.`}
          </p>
          <button
            className="accent"
            onClick={() => onDone({ subjectId, familiarity: result })}
          >
            Done →
          </button>
        </div>
      )}

      {(phase === "asking" || phase === "submitting") && (
        <footer className="pretest__foot">
          {onSkip && (
            <button
              className="ghost"
              onClick={onSkip}
              disabled={phase === "submitting"}
            >
              Skip for now
            </button>
          )}
          <button
            className="accent"
            disabled={!allAnswered || phase === "submitting"}
            onClick={submit}
          >
            {phase === "submitting" ? "Saving…" : "Save & continue →"}
          </button>
        </footer>
      )}
    </div>
  );
}
