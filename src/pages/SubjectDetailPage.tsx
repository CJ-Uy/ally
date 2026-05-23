type Chapter = { title: string; done: boolean; current?: boolean };

const MOCK_CHAPTERS: Chapter[] = [
  { title: "Ch. 1 · Vectors and matrices",          done: true  },
  { title: "Ch. 2 · Linear transformations",        done: true  },
  { title: "Ch. 3 · Determinants",                  done: true  },
  { title: "Ch. 4 · Eigenvalues & eigenvectors",    done: false, current: true },
  { title: "Ch. 5 · Orthogonality",                 done: false },
  { title: "Ch. 6 · Diagonalization",               done: false },
  { title: "Ch. 7 · Applications",                  done: false },
];

type SubjectDetailProps = {
  subject: { name: string; color: string; time: string; progress: number; chapter: string };
  onBack: () => void;
  onStartSession: () => void;
};

export function SubjectDetailPage({ subject, onBack, onStartSession }: SubjectDetailProps) {
  return (
    <div className="subject-detail">
      <div className="subject-detail__bar" style={{ background: subject.color }} />

      <div className="page-header">
        <div>
          <button className="btn btn--sm" type="button" onClick={onBack} style={{ marginBottom: 8 }}>
            ← Back
          </button>
          <div className="page-eyebrow">Subject</div>
          <h2 className="page-title">{subject.name}</h2>
        </div>
        <button className="btn btn--primary" type="button" onClick={onStartSession}>
          Start session →
        </button>
      </div>

      <div className="subject-detail__mini-stats">
        <div className="subject-detail__mini-stat">
          <div className="subject-detail__mini-value">{subject.time}</div>
          <div className="subject-detail__mini-label">Total time</div>
        </div>
        <div className="subject-detail__mini-stat">
          <div className="subject-detail__mini-value">14</div>
          <div className="subject-detail__mini-label">Sessions</div>
        </div>
        <div className="subject-detail__mini-stat">
          <div className="subject-detail__mini-value">32m</div>
          <div className="subject-detail__mini-label">Avg session</div>
        </div>
        <div className="subject-detail__mini-stat">
          <div className="subject-detail__mini-value">{Math.round(subject.progress * 100)}%</div>
          <div className="subject-detail__mini-label">Done</div>
        </div>
      </div>

      <div className="subject-detail__section-label">Chapter checklist</div>
      <div className="chapter-list">
        {MOCK_CHAPTERS.map((ch, i) => (
          <div key={i} className={`chapter-row${ch.current ? " chapter-row--current" : ""}${ch.done ? " chapter-row--done" : ""}`}>
            <div className={`chapter-row__check${ch.done ? " chapter-row__check--done" : ""}${ch.current ? " chapter-row__check--current" : ""}`} />
            <div className="chapter-row__title">{ch.title}</div>
            {ch.current && <span className="sticker sticker--fox-soft">You're here</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
