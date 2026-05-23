const SUBJECTS = [
  {
    name: "Linear Algebra",
    color: "var(--sky)",
    progress: 0.55,
    chapter: "Ch. 4 of 7",
    next: "Eigenvalues",
    upcoming: "Exam · in 6 days",
    time: "12h 30m",
  },
  {
    name: "History",
    color: "var(--butter)",
    progress: 0.3,
    chapter: "Module 3 of 10",
    next: "Reconstruction era",
    upcoming: "Essay due · in 11 days",
    time: "4h 12m",
  },
  {
    name: "Spanish",
    color: "var(--blush)",
    progress: 0.7,
    chapter: "Unit 8 of 12",
    next: "Subjunctive mood",
    upcoming: "Quiz · in 7 days",
    time: "6h 04m",
  },
  {
    name: "Creative Writing",
    color: "var(--sage)",
    progress: 0.15,
    chapter: "Workshop 2",
    next: "Character voice",
    upcoming: "Draft due · in 14 days",
    time: "1h 50m",
  },
];

export function SubjectsPage() {
  return (
    <div className="page-subjects">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Your subjects · {SUBJECTS.length}</div>
          <h2 className="page-title">Where you are, in each.</h2>
        </div>
        <button className="btn btn--primary" type="button">+ Add subject</button>
      </div>

      <div className="subjects-grid">
        {SUBJECTS.map((s, i) => (
          <div key={i} className="subject-card">
            <div className="subject-card__bar" style={{ background: s.color }} />

            <div className="subject-card__header">
              <div>
                <div className="subject-card__name">{s.name}</div>
                <div className="subject-card__chapter">{s.chapter.toUpperCase()}</div>
              </div>
              <div className="subject-card__time">{s.time}</div>
            </div>

            <div className="subject-card__progress">
              <div className="subject-card__progress-row">
                <span>Progress</span>
                <span>{Math.round(s.progress * 100)}%</span>
              </div>
              <div className="subject-card__bar-track">
                <div
                  className="subject-card__bar-fill"
                  style={{ width: `${s.progress * 100}%`, background: s.color }}
                />
              </div>
            </div>

            <div className="subject-card__footer">
              <div>
                <div className="subject-card__next-label">Next up</div>
                <div className="subject-card__next">{s.next}</div>
              </div>
              <span className="sticker sticker--fox-soft">{s.upcoming}</span>
            </div>

            <div className="subject-card__actions">
              <button className="btn btn--sm" type="button">Open</button>
              <button className="btn btn--sm" type="button">Update progress</button>
            </div>
          </div>
        ))}

        {/* Add subject card */}
        <div className="subject-card subject-card--add">
          <div className="subject-card__add-icon">+</div>
          <div className="subject-card__add-label">Add a subject</div>
          <div className="subject-card__add-sub">Upload a syllabus</div>
        </div>
      </div>
    </div>
  );
}
