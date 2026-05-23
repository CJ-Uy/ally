import { useSubjects, refreshAll } from "../data/store";

const SUBJECT_COLORS = [
  "var(--sky)",
  "var(--butter)",
  "var(--blush)",
  "var(--sage)",
  "var(--fox)",
];

type SubjectsPageProps = {
  onSelectSubject: (s: SubjectDto) => void;
  onAddSubject: () => void;
  onAddSemester: () => void;
};

export function SubjectsPage({ onSelectSubject, onAddSubject, onAddSemester }: SubjectsPageProps) {
  const [subjects, , { loading }] = useSubjects();

  const deleteSubject = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.api?.subjectsDelete) return;
    if (!confirm("Remove this subject and all its tasks?")) return;
    await window.api.subjectsDelete(id);
    refreshAll();
  };

  return (
    <div className="page-subjects">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Your subjects · {subjects.length}</div>
          <h2 className="page-title">Where you are, in each.</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="button" onClick={onAddSemester}>+ Add semester</button>
          <button className="btn btn--primary" type="button" onClick={onAddSubject}>+ Add subject</button>
        </div>
      </div>

      {loading && subjects.length === 0 ? (
        <div style={{ color: "var(--ink-soft)", padding: "24px 0" }}>Loading subjects…</div>
      ) : (
        <div className="subjects-grid">
          {subjects.map((s, i) => {
            const color = s.color || SUBJECT_COLORS[i % SUBJECT_COLORS.length];
            const familiarityLabel = s.familiarity
              ? { beginner: "Beginner", familiar: "Familiar", confident: "Confident" }[s.familiarity]
              : "Not assessed";

            return (
              <div key={s.id} className="subject-card">
                <div className="subject-card__bar" style={{ background: color }} />

                <div className="subject-card__header">
                  <div>
                    <div className="subject-card__name">{s.name}</div>
                    <div className="subject-card__chapter">{s.educationLevel.replace("_", " ").toUpperCase()}</div>
                  </div>
                </div>

                <div className="subject-card__footer">
                  <div>
                    <div className="subject-card__next-label">Familiarity</div>
                    <div className="subject-card__next">{familiarityLabel}</div>
                  </div>
                  <span className="sticker sticker--fox-soft">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="subject-card__actions">
                  <button className="btn btn--sm" type="button" onClick={() => onSelectSubject(s)}>Open</button>
                  <button className="btn btn--sm" type="button" onClick={(e) => deleteSubject(s.id, e)}>Remove</button>
                </div>
              </div>
            );
          })}

          <div className="subject-card subject-card--add" onClick={onAddSubject}>
            <div className="subject-card__add-icon">+</div>
            <div className="subject-card__add-label">Add a subject</div>
            <div className="subject-card__add-sub">Upload a syllabus</div>
          </div>
        </div>
      )}
    </div>
  );
}
