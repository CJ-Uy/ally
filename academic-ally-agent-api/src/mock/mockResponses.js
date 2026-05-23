const dataScienceCourse = {
  courseId: "course-data-science",
  courseName: "Introduction to Data Science",
  professor: "Dr. Santos",
  classSchedule: "To be confirmed",
  defaultProgress: 0
};

const linearAlgebraCourse = {
  courseId: "course-linear-algebra",
  courseName: "Linear Algebra for Computer Science",
  professor: "Prof. Reyes",
  classSchedule: "To be confirmed",
  defaultProgress: 0
};

export const mockDetectedCourses = [dataScienceCourse, linearAlgebraCourse];

export const mockGradingWeights = [
  {
    courseId: "course-data-science",
    courseName: "Introduction to Data Science",
    component: "Quizzes",
    weightPercent: 20
  },
  {
    courseId: "course-data-science",
    courseName: "Introduction to Data Science",
    component: "Midterm Exam",
    weightPercent: 25
  },
  {
    courseId: "course-data-science",
    courseName: "Introduction to Data Science",
    component: "Final Project",
    weightPercent: 35
  },
  {
    courseId: "course-data-science",
    courseName: "Introduction to Data Science",
    component: "Participation",
    weightPercent: 20
  },
  {
    courseId: "course-linear-algebra",
    courseName: "Linear Algebra for Computer Science",
    component: "Problem Sets",
    weightPercent: 30
  },
  {
    courseId: "course-linear-algebra",
    courseName: "Linear Algebra for Computer Science",
    component: "Midterm Exam",
    weightPercent: 25
  },
  {
    courseId: "course-linear-algebra",
    courseName: "Linear Algebra for Computer Science",
    component: "Final Exam",
    weightPercent: 30
  },
  {
    courseId: "course-linear-algebra",
    courseName: "Linear Algebra for Computer Science",
    component: "Class Participation",
    weightPercent: 15
  }
];

export const mockExtractedRequirements = [
  {
    taskId: "task-ds-quiz-1",
    courseId: "course-data-science",
    courseName: "Introduction to Data Science",
    taskName: "Quiz 1",
    taskType: "quiz",
    dueDate: "2026-06-14",
    gradingWeight: "Quizzes - 20%",
    estimatedDifficulty: 2,
    estimatedWorkloadHours: 2,
    confidenceScore: 0.95,
    needsConfirmation: false,
    clarificationNotes: ""
  },
  {
    taskId: "task-ds-midterm",
    courseId: "course-data-science",
    courseName: "Introduction to Data Science",
    taskName: "Midterm Exam",
    taskType: "exam",
    dueDate: "2026-07-10",
    gradingWeight: "Midterm Exam - 25%",
    estimatedDifficulty: 4,
    estimatedWorkloadHours: 8,
    confidenceScore: 0.95,
    needsConfirmation: false,
    clarificationNotes: ""
  },
  {
    taskId: "task-ds-project-proposal",
    courseId: "course-data-science",
    courseName: "Introduction to Data Science",
    taskName: "Final Project Proposal",
    taskType: "project",
    dueDate: "2026-07-20",
    gradingWeight: "Final Project - 35%",
    estimatedDifficulty: 4,
    estimatedWorkloadHours: 6,
    confidenceScore: 0.94,
    needsConfirmation: false,
    clarificationNotes: ""
  },
  {
    taskId: "task-ds-project-presentation",
    courseId: "course-data-science",
    courseName: "Introduction to Data Science",
    taskName: "Final Project Presentation",
    taskType: "presentation",
    dueDate: "2026-08-08",
    gradingWeight: "Final Project - 35%",
    estimatedDifficulty: 5,
    estimatedWorkloadHours: 10,
    confidenceScore: 0.94,
    needsConfirmation: false,
    clarificationNotes: ""
  },
  {
    taskId: "task-la-problem-set-1",
    courseId: "course-linear-algebra",
    courseName: "Linear Algebra for Computer Science",
    taskName: "Problem Set 1",
    taskType: "problem_set",
    dueDate: "2026-06-18",
    gradingWeight: "Problem Sets - 30%",
    estimatedDifficulty: 3,
    estimatedWorkloadHours: 4,
    confidenceScore: 0.96,
    needsConfirmation: false,
    clarificationNotes: ""
  },
  {
    taskId: "task-la-midterm",
    courseId: "course-linear-algebra",
    courseName: "Linear Algebra for Computer Science",
    taskName: "Midterm Exam",
    taskType: "exam",
    dueDate: "2026-07-15",
    gradingWeight: "Midterm Exam - 25%",
    estimatedDifficulty: 4,
    estimatedWorkloadHours: 8,
    confidenceScore: 0.95,
    needsConfirmation: false,
    clarificationNotes: ""
  },
  {
    taskId: "task-la-final",
    courseId: "course-linear-algebra",
    courseName: "Linear Algebra for Computer Science",
    taskName: "Final Exam",
    taskType: "exam",
    dueDate: "2026-08-12",
    gradingWeight: "Final Exam - 30%",
    estimatedDifficulty: 5,
    estimatedWorkloadHours: 12,
    confidenceScore: 0.95,
    needsConfirmation: false,
    clarificationNotes: ""
  }
];

export const createMockExtraction = () => ({
  detectedCourses: mockDetectedCourses,
  gradingWeights: mockGradingWeights,
  extractedRequirements: mockExtractedRequirements,
  uncertainItems: [],
  confirmationMessage:
    "I detected 2 courses and 7 academic requirements. Please confirm before I save them as tasks."
});

export const createMockDiagnostic = () => ({
  diagnosticResults: [
    {
      courseId: "course-data-science",
      courseName: "Introduction to Data Science",
      diagnosticQuestions: [
        "Have you practiced data cleaning with real datasets?",
        "Have you built regression or classification models before?",
        "Can you explain model evaluation metrics in your own words?"
      ],
      topicFamiliarity: [
        { topic: "Data cleaning", level: "familiar" },
        { topic: "Exploratory data analysis", level: "somewhat familiar" },
        { topic: "Visualization", level: "familiar" },
        { topic: "Regression", level: "unfamiliar" },
        { topic: "Classification", level: "unfamiliar" },
        { topic: "Model evaluation", level: "somewhat familiar" }
      ],
      weakTopics: ["Regression", "Classification"],
      confidenceLevel: "medium",
      recommendedStartingPoint:
        "Start with regression fundamentals, then connect classification and model evaluation to examples you already know from charts and data cleaning."
    },
    {
      courseId: "course-linear-algebra",
      courseName: "Linear Algebra for Computer Science",
      diagnosticQuestions: [
        "Can you solve systems of equations using matrices?",
        "Have you worked with vector spaces and linear transformations?",
        "Can you explain eigenvalues and eigenvectors visually?"
      ],
      topicFamiliarity: [
        { topic: "Matrices", level: "somewhat familiar" },
        { topic: "Systems of equations", level: "somewhat familiar" },
        { topic: "Vector spaces", level: "unfamiliar" },
        { topic: "Linear transformations", level: "unfamiliar" },
        { topic: "Eigenvalues", level: "unfamiliar" },
        { topic: "Eigenvectors", level: "unfamiliar" }
      ],
      weakTopics: ["Vector spaces", "Linear transformations", "Eigenvalues", "Eigenvectors"],
      confidenceLevel: "medium",
      recommendedStartingPoint:
        "Review matrix operations and systems of equations first, then build toward vector spaces before eigenvalues and eigenvectors."
    }
  ],
  message:
    "Your strongest starting points are data cleaning and basic charts. Regression, classification, eigenvalues, and eigenvectors should receive extra study time."
});

export const createMockPlanning = () => ({
  priorityRanking: [
    {
      taskId: "task-ds-quiz-1",
      courseName: "Introduction to Data Science",
      taskName: "Quiz 1",
      priority: "high",
      reason: "Earliest deadline and a good checkpoint for data cleaning, visualization, regression, and classification basics."
    },
    {
      taskId: "task-la-problem-set-1",
      courseName: "Linear Algebra for Computer Science",
      taskName: "Problem Set 1",
      priority: "high",
      reason: "Due soon and reinforces matrix and systems skills needed before later vector space topics."
    },
    {
      taskId: "task-ds-midterm",
      courseName: "Introduction to Data Science",
      taskName: "Midterm Exam",
      priority: "medium",
      reason: "High grading weight and weak diagnostic areas, but there is more time before the deadline."
    },
    {
      taskId: "task-la-midterm",
      courseName: "Linear Algebra for Computer Science",
      taskName: "Midterm Exam",
      priority: "medium",
      reason: "Important exam with weak prerequisite topics that should be built gradually."
    },
    {
      taskId: "task-ds-project-proposal",
      courseName: "Introduction to Data Science",
      taskName: "Final Project Proposal",
      priority: "medium",
      reason: "Large project component, but it should start after immediate quiz and problem set preparation."
    },
    {
      taskId: "task-ds-project-presentation",
      courseName: "Introduction to Data Science",
      taskName: "Final Project Presentation",
      priority: "low",
      reason: "Highest effort item, but the presentation is later in the term."
    },
    {
      taskId: "task-la-final",
      courseName: "Linear Algebra for Computer Science",
      taskName: "Final Exam",
      priority: "low",
      reason: "Major exam, but it is outside the immediate weekly planning window."
    }
  ],
  workloadWarnings: [
    "The first week should focus on near-term quiz and problem set preparation before expanding into deeper exam review."
  ],
  proposedStudyBlocks: [
    {
      studyBlockId: "block-001",
      courseName: "Introduction to Data Science",
      taskId: "task-ds-quiz-1",
      taskName: "Quiz 1",
      startTime: "2026-06-08T19:00:00",
      endTime: "2026-06-08T21:00:00",
      reason: "Start with data cleaning and visualization review while the quiz is the nearest deadline.",
      status: "pending_confirmation"
    },
    {
      studyBlockId: "block-002",
      courseName: "Linear Algebra for Computer Science",
      taskId: "task-la-problem-set-1",
      taskName: "Problem Set 1",
      startTime: "2026-06-09T19:00:00",
      endTime: "2026-06-09T21:00:00",
      reason: "Work through matrix and systems problems before the problem set deadline.",
      status: "pending_confirmation"
    },
    {
      studyBlockId: "block-003",
      courseName: "Introduction to Data Science",
      taskId: "task-ds-quiz-1",
      taskName: "Quiz 1",
      startTime: "2026-06-10T19:00:00",
      endTime: "2026-06-10T21:00:00",
      reason: "Practice regression and classification concepts flagged as weak.",
      status: "pending_confirmation"
    },
    {
      studyBlockId: "block-004",
      courseName: "Linear Algebra for Computer Science",
      taskId: "task-la-problem-set-1",
      taskName: "Problem Set 1",
      startTime: "2026-06-11T19:00:00",
      endTime: "2026-06-11T21:00:00",
      reason: "Finish problem set work and review vector space fundamentals.",
      status: "pending_confirmation"
    },
    {
      studyBlockId: "block-005",
      courseName: "Introduction to Data Science",
      taskId: "task-ds-midterm",
      taskName: "Midterm Exam",
      startTime: "2026-06-12T19:00:00",
      endTime: "2026-06-12T21:00:00",
      reason: "Begin midterm review early with model evaluation practice.",
      status: "pending_confirmation"
    }
  ],
  scheduleSummary:
    "I planned five 2-hour study blocks from Monday to Friday, 7 PM to 9 PM, prioritizing the earliest deadlines and weak diagnostic topics.",
  confirmationMessage:
    "Please confirm this proposed schedule before I create calendar events, to-dos, or reminders."
});

export const createMockExecution = () => ({
  globalTodoList: [
    {
      taskId: "task-ds-quiz-1",
      courseName: "Introduction to Data Science",
      taskName: "Quiz 1",
      dueDate: "2026-06-14",
      status: "scheduled",
      priority: "high"
    },
    {
      taskId: "task-la-problem-set-1",
      courseName: "Linear Algebra for Computer Science",
      taskName: "Problem Set 1",
      dueDate: "2026-06-18",
      status: "scheduled",
      priority: "high"
    },
    {
      taskId: "task-ds-midterm",
      courseName: "Introduction to Data Science",
      taskName: "Midterm Exam",
      dueDate: "2026-07-10",
      status: "scheduled",
      priority: "medium"
    },
    {
      taskId: "task-la-midterm",
      courseName: "Linear Algebra for Computer Science",
      taskName: "Midterm Exam",
      dueDate: "2026-07-15",
      status: "scheduled",
      priority: "medium"
    }
  ],
  courseTaskLists: {
    "Introduction to Data Science": [
      {
        taskId: "task-ds-quiz-1",
        taskName: "Quiz 1",
        status: "scheduled",
        priority: "high"
      },
      {
        taskId: "task-ds-midterm",
        taskName: "Midterm Exam",
        status: "scheduled",
        priority: "medium"
      }
    ],
    "Linear Algebra for Computer Science": [
      {
        taskId: "task-la-problem-set-1",
        taskName: "Problem Set 1",
        status: "scheduled",
        priority: "high"
      },
      {
        taskId: "task-la-midterm",
        taskName: "Midterm Exam",
        status: "scheduled",
        priority: "medium"
      }
    ]
  },
  calendarEvents: [
    {
      eventId: "event-block-001",
      title: "Study: Data Science Quiz 1",
      startTime: "2026-06-08T19:00:00",
      endTime: "2026-06-08T21:00:00",
      description: "Review data cleaning, visualization, regression, and classification basics."
    },
    {
      eventId: "event-block-002",
      title: "Study: Linear Algebra Problem Set 1",
      startTime: "2026-06-09T19:00:00",
      endTime: "2026-06-09T21:00:00",
      description: "Work through matrices and systems of equations."
    },
    {
      eventId: "event-block-003",
      title: "Study: Data Science Quiz Practice",
      startTime: "2026-06-10T19:00:00",
      endTime: "2026-06-10T21:00:00",
      description: "Practice regression, classification, and model evaluation."
    },
    {
      eventId: "event-block-004",
      title: "Study: Linear Algebra Review",
      startTime: "2026-06-11T19:00:00",
      endTime: "2026-06-11T21:00:00",
      description: "Finish problem set work and review vector spaces."
    },
    {
      eventId: "event-block-005",
      title: "Study: Data Science Midterm Prep",
      startTime: "2026-06-12T19:00:00",
      endTime: "2026-06-12T21:00:00",
      description: "Begin midterm review with model evaluation practice."
    }
  ],
  notificationRules: [
    {
      notificationId: "notify-block-001",
      type: "study_block",
      message: "Study block starts in 30 minutes: Data Science Quiz 1.",
      scheduledTime: "2026-06-08T18:30:00"
    },
    {
      notificationId: "notify-la-deadline",
      type: "deadline",
      message: "Problem Set 1 is due soon. Keep Thursday's study block protected.",
      scheduledTime: "2026-06-16T09:00:00"
    },
    {
      notificationId: "notify-workload",
      type: "workload_warning",
      message: "This week has two high-priority tasks. Keep breaks short and planned.",
      scheduledTime: "2026-06-08T09:00:00"
    }
  ],
  focusStatus: {
    ready: true,
    message:
      "Focus mode is ready. The native Electron app enforces app locking; the backend only returns the requested focus policy."
  },
  nextStudyBlock: "block-001",
  accountabilityMessage:
    "Your plan is now simulated as to-dos, calendar events, and reminders. The next study block is Data Science Quiz 1 on Monday from 7 PM to 9 PM."
});

export const createMockFocusStatus = ({
  studyBlockId = "block-001",
  allowedApps = ["Notes", "Browser"],
  blockedApps = ["TikTok", "Instagram", "YouTube"]
} = {}) => ({
  studyBlockId,
  mode: "ready_for_native_enforcement",
  allowedApps,
  blockedApps,
  startedAt: "2026-06-08T18:55:00.000Z",
  message:
    "Focus lock is simulated by the backend. The native Electron app is responsible for enforcing app locking."
});

export const createMockBreakDecision = ({
  studyBlockId = "block-001",
  reason = "I am exhausted",
  fatigueRating = 8
} = {}) => {
  const rating = Number(fatigueRating);

  if (rating >= 8) {
    return {
      studyBlockId,
      decision: "approve_break",
      approvedBreakMinutes: 20,
      rescheduleSuggestion: "Resume with one 25-minute focused block after the break.",
      message:
        "A break is approved. High fatigue makes forced studying counterproductive, so take 20 minutes and restart with a smaller block.",
      reason
    };
  }

  if (rating >= 5) {
    return {
      studyBlockId,
      decision: "suggest_shorter_break",
      approvedBreakMinutes: 10,
      rescheduleSuggestion: "Return for a short review sprint and stop after one clear task.",
      message:
        "Take a shorter reset break, then return for one manageable review sprint.",
      reason
    };
  }

  return {
    studyBlockId,
    decision: "continue_with_adjustment",
    approvedBreakMinutes: 5,
    rescheduleSuggestion: "Switch to a lighter review task for the next 20 minutes.",
    message:
      "A quick reset is reasonable, but you likely do not need to reschedule the whole block.",
    reason
  };
};
