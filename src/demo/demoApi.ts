const DAY = 24 * 60 * 60 * 1000;

function isoAt(offsetDays: number, hour: number, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
}

function currentDateKey() {
  return new Date().toISOString().slice(0, 10);
}

const demoProfile: UserProfileDto = {
  id: 1,
  studyHoursPerWeek: 15,
  educationLevel: "college",
  onboardedAt: isoAt(-10, 9),
  notifyAtRisk: true,
  notifyDueToday: true,
  notifyStreakDanger: true,
  notifyChatResponse: false,
};

const initialSubjects: SubjectDto[] = [
  {
    id: 1,
    name: "Linear Algebra",
    educationLevel: "college",
    color: "var(--sky)",
    createdAt: isoAt(-9, 10),
    familiarity: "familiar",
  },
  {
    id: 2,
    name: "Biology 12",
    educationLevel: "college",
    color: "var(--sage)",
    createdAt: isoAt(-9, 10),
    familiarity: "beginner",
  },
  {
    id: 3,
    name: "Management Narratives",
    educationLevel: "college",
    color: "var(--butter)",
    createdAt: isoAt(-9, 10),
    familiarity: "confident",
  },
];

const initialTasks: TaskDto[] = [
  {
    id: 1,
    subjectId: 2,
    title: "Biology Lab Report",
    description: "Draft results and discussion from the microscopy lab.",
    dueDate: isoAt(0, 23, 59),
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes: 120,
    status: "in_progress",
    parentTaskId: null,
    createdBy: "ai",
    createdAt: isoAt(-7, 12),
  },
  {
    id: 2,
    subjectId: 3,
    title: "Management Reflection Essay",
    description: "Connect the assigned narrative to leadership frameworks.",
    dueDate: isoAt(1, 23, 59),
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes: 90,
    status: "todo",
    parentTaskId: null,
    createdBy: "ai",
    createdAt: isoAt(-7, 12),
  },
  {
    id: 3,
    subjectId: 1,
    title: "Linear Algebra Problem Set",
    description: "Matrices, row reduction, and vector spaces.",
    dueDate: isoAt(0, 21, 0),
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes: 75,
    status: "todo",
    parentTaskId: null,
    createdBy: "ai",
    createdAt: isoAt(-7, 12),
  },
  {
    id: 4,
    subjectId: 1,
    title: "Watch eigenvalue lecture",
    description: null,
    dueDate: isoAt(3, 18, 0),
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes: 45,
    status: "todo",
    parentTaskId: null,
    createdBy: "user",
    createdAt: isoAt(-3, 15),
  },
  {
    id: 5,
    subjectId: 2,
    title: "Read cell structure chapter",
    description: null,
    dueDate: isoAt(-1, 23, 59),
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes: 60,
    status: "todo",
    parentTaskId: null,
    createdBy: "ai",
    createdAt: isoAt(-5, 9),
  },
];

const initialEvents: CalendarEventDto[] = [
  {
    id: 1,
    subjectId: 2,
    title: "Biology Lab Report due",
    type: "deadline",
    startsAt: isoAt(0, 23, 59),
    endsAt: null,
    createdAt: isoAt(-7, 12),
  },
  {
    id: 2,
    subjectId: 1,
    title: "Linear Algebra practice block",
    type: "study_block",
    startsAt: isoAt(0, 19, 0),
    endsAt: isoAt(0, 20, 0),
    createdAt: isoAt(-2, 12),
  },
  {
    id: 3,
    subjectId: 3,
    title: "Reflection Essay due",
    type: "deadline",
    startsAt: isoAt(1, 23, 59),
    endsAt: null,
    createdAt: isoAt(-7, 12),
  },
  {
    id: 4,
    subjectId: 1,
    title: "Midterm Exam",
    type: "exam",
    startsAt: isoAt(12, 9, 0),
    endsAt: isoAt(12, 11, 0),
    createdAt: isoAt(-7, 12),
  },
  {
    id: 5,
    subjectId: 2,
    title: "Long Exam",
    type: "exam",
    startsAt: isoAt(14, 13, 0),
    endsAt: isoAt(14, 15, 0),
    createdAt: isoAt(-7, 12),
  },
];

function makeParseResult(subjectName = "Course"): SyllabusParseResult {
  const isBio = subjectName.toLowerCase().includes("biology");
  const isMgmt = subjectName.toLowerCase().includes("management");
  return {
    deadlinesCreated: isMgmt ? 1 : 2,
    eventsCreated: isBio ? 1 : 1,
    parsed: {
      courseName: subjectName,
      difficulty: isBio ? "heavy" : isMgmt ? "moderate" : "heavy",
      gradingBreakdown: isMgmt
        ? [
            { component: "Reflection Essays", weightPercent: 40 },
            { component: "Final Portfolio", weightPercent: 30 },
            { component: "Participation", weightPercent: 30 },
          ]
        : [
            { component: "Problem Sets", weightPercent: 20 },
            { component: "Lab / Written Work", weightPercent: 25 },
            { component: "Exams", weightPercent: 55 },
          ],
      topics: isBio
        ? ["Cell structure", "Lab methods", "Genetics"]
        : isMgmt
          ? ["Reflective writing", "Narrative analysis", "Leadership"]
          : ["Matrices", "Vector spaces", "Eigenvalues"],
      deadlines: [
        {
          title: isMgmt ? "Reflection Essay" : isBio ? "Lab Report" : "Problem Set 1",
          dueDate: isoAt(isMgmt ? 1 : 0, 23, 59).slice(0, 10),
          dueTime: "11:59 PM",
          type: "assignment",
          estimatedMinutes: isMgmt ? 90 : 120,
        },
        ...(isMgmt
          ? []
          : [
              {
                title: isBio ? "Cell Structure Reading" : "Matrix Practice",
                dueDate: isoAt(3, 23, 59).slice(0, 10),
                dueTime: "11:59 PM",
                type: "reading" as const,
                estimatedMinutes: 60,
              },
            ]),
      ],
      exams: [
        {
          title: isBio ? "Long Exam" : "Midterm Exam",
          date: isoAt(isBio ? 14 : 12, 9).slice(0, 10),
          time: isBio ? "1:00 PM" : "9:00 AM",
          weightPercent: isBio ? 30 : 25,
        },
      ],
    },
  };
}

function getDemoMode() {
  return new URLSearchParams(window.location.search).get("demo");
}

function shouldInstallDemoApi() {
  return (
    import.meta.env.VITE_ALLY_DEMO_CAPTURE === "1" ||
    new URLSearchParams(window.location.search).has("demo")
  );
}

export function installDemoApiIfNeeded() {
  if (!shouldInstallDemoApi()) return;

  let profile: UserProfileDto | null = getDemoMode() === "onboarding" ? null : demoProfile;
  let subjects = [...initialSubjects];
  let tasks = [...initialTasks];
  let events = [...initialEvents];
  let nextSubjectId = 20;
  let nextTaskId = 40;
  let nextEventId = 40;
  let pickIndex = 0;
  let sessionSnap: SessionStateSnapshot = {
    session: {
      active: new URLSearchParams(window.location.search).get("session") === "active",
      elapsedMs: 8 * 60 * 1000,
      paused: false,
    },
    break: { active: false, msRemaining: 0 },
  };
  const stateListeners = new Set<(snap: SessionStateSnapshot) => void>();

  const notifyState = () => {
    for (const listener of stateListeners) listener(sessionSnap);
  };

  const fileNames = [
    "/Academic Ally Demo/Linear Algebra Syllabus.pdf",
    "/Academic Ally Demo/Biology 12 Syllabus.pdf",
    "/Academic Ally Demo/Management Narratives Syllabus.pdf",
  ];

  const api: Window["api"] = {
    ping: async () => "pong",
    dbHealth: async () => ({ ok: true }),
    aiStatus: async () => ({
      ollama: {
        provider: "ollama",
        alive: false,
        latencyMs: null,
        error: "Demo capture mode",
      },
      gemini: {
        provider: "gemini",
        alive: false,
        latencyMs: null,
        error: "Demo capture mode",
      },
    }),
    r2List: async () => ({ objects: [], truncated: false, delimitedPrefixes: [] }),
    sessionStart: async () => {
      sessionSnap = {
        session: { active: true, elapsedMs: 8 * 60 * 1000, paused: false },
        break: { active: false, msRemaining: 0 },
      };
      notifyState();
    },
    sessionStop: async () => {
      sessionSnap = {
        session: { active: false, elapsedMs: 0, paused: false },
        break: { active: false, msRemaining: 0 },
      };
      notifyState();
    },
    sessionGetState: async () => sessionSnap,
    sessionSetSubject: async () => ({ ok: true }),
    chatSend: async (text) => ({
      visibleText: text.toLowerCase().includes("skip")
        ? "I don't recommend skipping completely because your lab report is close. Take 15 minutes, then do a lighter 30-minute block."
        : "Okay. You have no urgent deadline tonight, so I'll move this session to tomorrow at 7:00 PM.",
      granted: true,
      minutes: 5,
    }),
    lockClose: async () => undefined,
    onStateUpdate: (cb) => {
      stateListeners.add(cb);
      window.setTimeout(() => cb(sessionSnap), 0);
      return () => stateListeners.delete(cb);
    },
    onLockOpen: (cb) => {
      const id = window.setTimeout(
        () => cb({ keyword: "TikTok", title: "TikTok - For You" }),
        0,
      );
      return () => window.clearTimeout(id);
    },
    orbAskAi: async () => undefined,
    orbSetVisible: async () => undefined,
    onOpenChat: () => () => undefined,
    schemaBootstrap: async () => ({ ok: true }),
    profileGet: async () => profile,
    profileSave: async (payload) => {
      profile = { ...demoProfile, ...payload, onboardedAt: new Date().toISOString() };
      return profile;
    },
    profileUpdateNotifications: async (payload) => {
      profile = { ...(profile ?? demoProfile), ...payload };
      return profile;
    },
    activityToday: async () => ({
      date: currentDateKey(),
      sessionsCompleted: 2,
      breaksUsed: 1,
      streakDays: 4,
    }),
    subjectsList: async () => subjects,
    subjectsCreate: async (payload) => {
      const existing = subjects.find((s) => s.name === payload.name);
      if (existing) return existing;
      const subject: SubjectDto = {
        id: nextSubjectId++,
        name: payload.name,
        educationLevel: payload.educationLevel,
        color: ["var(--sky)", "var(--sage)", "var(--butter)", "var(--blush)"][
          subjects.length % 4
        ],
        createdAt: new Date().toISOString(),
        familiarity: null,
      };
      subjects = [...subjects, subject];
      return subject;
    },
    subjectsUpdate: async (id, patch) => {
      subjects = subjects.map((subject) =>
        subject.id === id ? { ...subject, ...patch } : subject,
      );
      return { ok: true };
    },
    subjectsDelete: async (id) => {
      subjects = subjects.filter((subject) => subject.id !== id);
      tasks = tasks.filter((task) => task.subjectId !== id);
      events = events.filter((event) => event.subjectId !== id);
      return { ok: true };
    },
    subjectsSetFamiliarity: async (id, level) => {
      subjects = subjects.map((subject) =>
        subject.id === id ? { ...subject, familiarity: level } : subject,
      );
      return { ok: true };
    },
    preTestGenerate: async (subjectId) => {
      const subject = subjects.find((s) => s.id === subjectId);
      return {
        subjectId,
        subjectName: subject?.name ?? "Course",
        questions: [
          {
            prompt: `How comfortable are you with the first unit of ${subject?.name ?? "this course"}?`,
            choices: ["New to me", "Somewhat familiar", "Very familiar"],
            correctIndex: 1,
            band: "familiar",
          },
          {
            prompt: "How much review time do you expect to need before the first major assessment?",
            choices: ["A lot", "A moderate amount", "Very little"],
            correctIndex: 1,
            band: "beginner",
          },
        ],
      };
    },
    preTestSubmit: async (payload) => {
      const familiarity: SubjectFamiliarity = payload.subjectId % 3 === 0 ? "confident" : "familiar";
      subjects = subjects.map((subject) =>
        subject.id === payload.subjectId ? { ...subject, familiarity } : subject,
      );
      return { familiarity };
    },
    syllabusPickPdf: async () => fileNames[pickIndex++ % fileNames.length],
    syllabusParseAndApply: async (subjectId) => {
      const subject = subjects.find((s) => s.id === subjectId);
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      const result = makeParseResult(subject?.name);
      for (const deadline of result.parsed.deadlines) {
        tasks = [
          ...tasks,
          {
            id: nextTaskId++,
            subjectId,
            title: deadline.title,
            description: null,
            dueDate: new Date(`${deadline.dueDate}T23:59:00`).toISOString(),
            scheduledStart: null,
            scheduledEnd: null,
            estimatedMinutes: deadline.estimatedMinutes,
            status: "todo",
            parentTaskId: null,
            createdBy: "ai",
            createdAt: new Date().toISOString(),
          },
        ];
      }
      for (const exam of result.parsed.exams) {
        events = [
          ...events,
          {
            id: nextEventId++,
            subjectId,
            title: exam.title,
            type: "exam",
            startsAt: new Date(`${exam.date}T09:00:00`).toISOString(),
            endsAt: new Date(`${exam.date}T11:00:00`).toISOString(),
            createdAt: new Date().toISOString(),
          },
        ];
      }
      return result;
    },
    tasksList: async () => tasks,
    tasksListToday: async () =>
      tasks.filter((task) => task.status !== "done" && task.dueDate && new Date(task.dueDate).getTime() <= Date.now() + DAY),
    tasksListOverdue: async () =>
      tasks.filter((task) => task.dueDate && new Date(task.dueDate).getTime() < Date.now()),
    tasksAtRisk: async () => [
      {
        taskId: 1,
        title: "Biology Lab Report",
        subjectId: 2,
        subjectName: "Biology 12",
        dueDate: isoAt(0, 23, 59),
        estimatedMinutes: 120,
        minutesUntilDue: 240,
        reason: "insufficient_time",
        shortfallMinutes: 45,
      },
      {
        taskId: 5,
        title: "Read cell structure chapter",
        subjectId: 2,
        subjectName: "Biology 12",
        dueDate: isoAt(-1, 23, 59),
        estimatedMinutes: 60,
        minutesUntilDue: -720,
        reason: "overdue",
        shortfallMinutes: 60,
      },
    ],
    tasksListForSubject: async (subjectId) => tasks.filter((task) => task.subjectId === subjectId),
    tasksCreate: async (payload) => {
      const task: TaskDto = {
        id: nextTaskId++,
        subjectId: payload.subjectId,
        title: payload.title,
        description: payload.description ?? null,
        dueDate: payload.dueDate ?? null,
        scheduledStart: payload.scheduledStart ?? null,
        scheduledEnd: payload.scheduledEnd ?? null,
        estimatedMinutes: payload.estimatedMinutes ?? null,
        status: "todo",
        parentTaskId: null,
        createdBy: "user",
        createdAt: new Date().toISOString(),
      };
      tasks = [...tasks, task];
      return task;
    },
    tasksUpdate: async (id, patch) => {
      let updated: TaskDto | null = null;
      tasks = tasks.map((task) => {
        if (task.id !== id) return task;
        updated = { ...task, ...patch };
        return updated;
      });
      return updated;
    },
    tasksDelete: async (id) => {
      tasks = tasks.filter((task) => task.id !== id);
      return { ok: true };
    },
    eventsList: async () => events,
    eventsListUpcoming: async () =>
      events.filter((event) => new Date(event.startsAt).getTime() >= Date.now() - DAY),
    eventsCreate: async (payload) => {
      const event: CalendarEventDto = {
        id: nextEventId++,
        subjectId: payload.subjectId,
        title: payload.title,
        type: payload.type,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt ?? null,
        createdAt: new Date().toISOString(),
      };
      events = [...events, event];
      return event;
    },
    eventsUpdate: async (id, patch) => {
      let updated: CalendarEventDto | null = null;
      events = events.map((event) => {
        if (event.id !== id) return event;
        updated = { ...event, ...patch };
        return updated;
      });
      return updated;
    },
    eventsDelete: async (id) => {
      events = events.filter((event) => event.id !== id);
      return { ok: true };
    },
    plannerChat: async () => ({
      visibleText: "Start with the Biology Lab Report. It is due soon, weighted heavily, and still needs work.",
    }),
    plannerHistory: async () => [
      {
        role: "user",
        text: "What should I work on next?",
      },
      {
        role: "model",
        text: "Start with the Biology Lab Report because it is due soon and still in progress.",
      },
    ],
    plannerReset: async () => ({ ok: true }),
  };

  window.api = api;
}
