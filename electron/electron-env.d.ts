/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string;
    /** /dist/ or /public/ */
    VITE_PUBLIC: string;
  }
}

interface SessionStateSnapshot {
  session: { active: boolean; elapsedMs: number; paused: boolean };
  break: { active: boolean; msRemaining: number; forKeyword?: string };
}

interface ChatSendResult {
  visibleText: string;
  granted?: boolean;
  minutes?: number;
}

interface LockOpenInfo {
  keyword: string;
  title: string;
}

interface UserProfileDto {
  id: number;
  studyHoursPerWeek: number;
  educationLevel: string;
  onboardedAt: string;
  notifyAtRisk: boolean;
  notifyDueToday: boolean;
  notifyStreakDanger: boolean;
  notifyChatResponse: boolean;
}

type NotificationToggleKey =
  | "notifyAtRisk"
  | "notifyDueToday"
  | "notifyStreakDanger"
  | "notifyChatResponse";

type SubjectFamiliarity = "beginner" | "familiar" | "confident";

interface SubjectDto {
  id: number;
  name: string;
  educationLevel: string;
  color: string;
  createdAt: string;
  familiarity: SubjectFamiliarity | null;
}

interface PreTestQuestionDto {
  prompt: string;
  choices: string[];
  correctIndex: number;
  band: SubjectFamiliarity;
}

interface PreTestPayloadDto {
  subjectId: number;
  subjectName: string;
  questions: PreTestQuestionDto[];
}

interface ActivityTodayDto {
  date: string;
  sessionsCompleted: number;
  breaksUsed: number;
  streakDays: number;
}

interface TaskDto {
  id: number;
  subjectId: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  estimatedMinutes: number | null;
  status: "todo" | "in_progress" | "done";
  parentTaskId: number | null;
  createdBy: "user" | "ai";
  createdAt: string;
}

type CalendarEventType = "exam" | "class" | "deadline" | "study_block";

interface CalendarEventDto {
  id: number;
  subjectId: number;
  title: string;
  type: CalendarEventType;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
}

interface ParsedSyllabusDto {
  courseName: string | null;
  difficulty: "light" | "moderate" | "heavy" | "intense";
  gradingBreakdown: Array<{ component: string; weightPercent: number }>;
  topics: string[];
  deadlines: Array<{
    title: string;
    dueDate: string;
    dueTime: string | null;
    type: "assignment" | "project" | "reading" | "quiz";
    estimatedMinutes: number | null;
  }>;
  exams: Array<{
    title: string;
    date: string;
    time: string | null;
    weightPercent: number | null;
  }>;
}

interface SyllabusParseResult {
  parsed: ParsedSyllabusDto;
  deadlinesCreated: number;
  eventsCreated: number;
}

interface PlannerChatTurn {
  role: "user" | "model";
  text: string;
}

interface AtRiskItemDto {
  taskId: number;
  title: string;
  subjectId: number;
  subjectName: string;
  dueDate: string;
  estimatedMinutes: number;
  minutesUntilDue: number;
  reason: "overdue" | "insufficient_time";
  shortfallMinutes: number;
}

type Unsubscribe = () => void;

// Used in Renderer process, expose in `preload.ts`
interface Window {
  api: {
    ping: () => Promise<string>;
    dbHealth: () => Promise<{ ok: boolean }>;
    r2List: (prefix?: string) => Promise<{
      objects: Array<{
        key: string;
        size: number;
        etag?: string;
        uploaded?: string;
      }>;
      truncated: boolean;
      cursor?: string;
      delimitedPrefixes: string[];
    }>;
    sessionStart: (subject?: string) => Promise<void>;
    sessionStop: () => Promise<void>;
    sessionGetState: () => Promise<SessionStateSnapshot>;
    sessionSetSubject: (subject: string) => Promise<{ ok: true }>;
    chatSend: (text: string) => Promise<ChatSendResult>;
    lockClose: () => Promise<void>;
    onStateUpdate: (cb: (snap: SessionStateSnapshot) => void) => Unsubscribe;
    onLockOpen: (cb: (info: LockOpenInfo) => void) => Unsubscribe;

    orbAskAi: () => Promise<void>;
    orbSetVisible: (visible: boolean) => Promise<void>;
    onOpenChat: (cb: () => void) => Unsubscribe;

    schemaBootstrap: () => Promise<{ ok: boolean }>;

    profileGet: () => Promise<UserProfileDto | null>;
    profileSave: (payload: {
      studyHoursPerWeek: number;
      educationLevel: string;
    }) => Promise<UserProfileDto>;
    profileUpdateNotifications: (
      payload: Partial<Record<NotificationToggleKey, boolean>>,
    ) => Promise<{
      notifyAtRisk: boolean;
      notifyDueToday: boolean;
      notifyStreakDanger: boolean;
      notifyChatResponse: boolean;
    } | null>;

    activityToday: () => Promise<ActivityTodayDto>;

    subjectsList: () => Promise<SubjectDto[]>;
    subjectsCreate: (payload: {
      name: string;
      educationLevel: string;
    }) => Promise<SubjectDto>;
    subjectsUpdate: (
      id: number,
      patch: { name?: string; color?: string },
    ) => Promise<{ ok: true }>;
    subjectsDelete: (id: number) => Promise<{ ok: true }>;
    subjectsSetFamiliarity: (
      id: number,
      level: SubjectFamiliarity | null,
    ) => Promise<{ ok: true }>;

    preTestGenerate: (subjectId: number) => Promise<PreTestPayloadDto>;
    preTestSubmit: (payload: {
      subjectId: number;
      answers: Array<{ questionIndex: number; choiceIndex: number }>;
      questions: PreTestQuestionDto[];
    }) => Promise<{ familiarity: SubjectFamiliarity }>;

    syllabusPickPdf: () => Promise<string | null>;
    syllabusParseAndApply: (
      subjectId: number,
      filePath: string,
    ) => Promise<SyllabusParseResult>;

    tasksList: () => Promise<TaskDto[]>;
    tasksListToday: () => Promise<TaskDto[]>;
    tasksListOverdue: () => Promise<TaskDto[]>;
    tasksAtRisk: () => Promise<AtRiskItemDto[]>;
    tasksListForSubject: (subjectId: number) => Promise<TaskDto[]>;
    tasksCreate: (payload: {
      subjectId: number;
      title: string;
      description?: string;
      dueDate?: string | null;
      scheduledStart?: string | null;
      scheduledEnd?: string | null;
      estimatedMinutes?: number | null;
    }) => Promise<TaskDto>;
    tasksUpdate: (
      id: number,
      patch: {
        title?: string;
        description?: string | null;
        dueDate?: string | null;
        scheduledStart?: string | null;
        scheduledEnd?: string | null;
        estimatedMinutes?: number | null;
        status?: TaskDto["status"];
      },
    ) => Promise<TaskDto | null>;
    tasksDelete: (id: number) => Promise<{ ok: true }>;

    eventsList: () => Promise<CalendarEventDto[]>;
    eventsListUpcoming: () => Promise<CalendarEventDto[]>;
    eventsCreate: (payload: {
      subjectId: number;
      title: string;
      type: CalendarEventType;
      startsAt: string;
      endsAt?: string | null;
    }) => Promise<CalendarEventDto>;
    eventsUpdate: (
      id: number,
      patch: {
        title?: string;
        type?: CalendarEventType;
        startsAt?: string;
        endsAt?: string | null;
      },
    ) => Promise<CalendarEventDto | null>;
    eventsDelete: (id: number) => Promise<{ ok: true }>;

    plannerChat: (text: string) => Promise<{ visibleText: string }>;
    plannerHistory: () => Promise<PlannerChatTurn[]>;
    plannerReset: () => Promise<{ ok: true }>;
  };
}
