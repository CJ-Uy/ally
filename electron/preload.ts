import electron from "electron";

const { contextBridge, ipcRenderer } = electron as typeof import("electron");

interface SessionStateSnapshot {
  session: { active: boolean; elapsedMs: number; paused: boolean };
  break: { active: boolean; msRemaining: number; forKeyword?: string };
}

const invoke = <T = unknown>(channel: string, payload?: unknown) =>
  ipcRenderer.invoke(channel, payload) as Promise<T>;

const api: Window["api"] = {
  ping: () => invoke<string>("app:ping"),
  dbHealth: () => invoke<{ ok: boolean }>("db:health"),
  r2List: (prefix?: string) =>
    invoke("r2:list", prefix) as Promise<{
      objects: Array<{
        key: string;
        size: number;
        etag?: string;
        uploaded?: string;
      }>;
      truncated: boolean;
      cursor?: string;
      delimitedPrefixes: string[];
    }>,
  sessionStart: (subject?: string) =>
    invoke<void>("session:start", subject ? { subject } : undefined),
  sessionStop: () => invoke<void>("session:stop"),
  sessionGetState: () => invoke<SessionStateSnapshot>("session:getState"),
  sessionSetSubject: (subject: string) =>
    invoke<{ ok: true }>("session:setSubject", { subject }),
  chatSend: (text: string) =>
    invoke("chat:send", { text }) as Promise<{
      visibleText: string;
      granted?: boolean;
      minutes?: number;
    }>,
  lockClose: () => invoke<void>("lock:close"),
  onStateUpdate: (cb: (snap: SessionStateSnapshot) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      snap: SessionStateSnapshot,
    ) => cb(snap);
    ipcRenderer.on("state:update", listener);
    return () => ipcRenderer.removeListener("state:update", listener);
  },
  onLockOpen: (cb: (info: { keyword: string; title: string }) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      info: { keyword: string; title: string },
    ) => cb(info);
    ipcRenderer.on("lock:open", listener);
    return () => ipcRenderer.removeListener("lock:open", listener);
  },

  orbAskAi: () => invoke<void>("orb:askAi"),
  orbSetVisible: (visible: boolean) =>
    invoke<void>("orb:setVisible", { visible }),
  onOpenChat: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on("chat:open", listener);
    return () => ipcRenderer.removeListener("chat:open", listener);
  },

  schemaBootstrap: () => invoke<{ ok: boolean }>("schema:bootstrap"),

  profileGet: () => invoke<UserProfileDto | null>("profile:get"),
  profileSave: (payload) => invoke("profile:save", payload),
  profileUpdateNotifications: (payload) =>
    invoke<{
      notifyAtRisk: boolean;
      notifyDueToday: boolean;
      notifyStreakDanger: boolean;
      notifyChatResponse: boolean;
    } | null>("profile:updateNotifications", payload),

  activityToday: () =>
    invoke<{
      date: string;
      sessionsCompleted: number;
      breaksUsed: number;
      streakDays: number;
    }>("activity:today"),

  subjectsList: () => invoke("subjects:list"),
  subjectsCreate: (payload) => invoke("subjects:create", payload),
  subjectsUpdate: (id, patch) => invoke("subjects:update", { id, patch }),
  subjectsDelete: (id) => invoke("subjects:delete", { id }),
  subjectsSetFamiliarity: (id, level) =>
    invoke<{ ok: true }>("subjects:setFamiliarity", { id, level }),

  preTestGenerate: (subjectId) =>
    invoke<{
      subjectId: number;
      subjectName: string;
      questions: Array<{
        prompt: string;
        choices: string[];
        correctIndex: number;
        band: "beginner" | "familiar" | "confident";
      }>;
    }>("pretest:generate", { subjectId }),
  preTestSubmit: (payload) =>
    invoke<{ familiarity: "beginner" | "familiar" | "confident" }>(
      "pretest:submit",
      payload,
    ),

  syllabusPickPdf: () => invoke<string | null>("syllabus:pickPdf"),
  syllabusParseAndApply: (subjectId, filePath) =>
    invoke("syllabus:parseAndApply", { subjectId, filePath }),

  tasksList: () => invoke("tasks:list"),
  tasksListToday: () => invoke("tasks:listToday"),
  tasksListOverdue: () => invoke("tasks:listOverdue"),
  tasksAtRisk: () => invoke("tasks:atRisk"),
  tasksListForSubject: (subjectId) =>
    invoke("tasks:listForSubject", { subjectId }),
  tasksCreate: (payload) => invoke("tasks:create", payload),
  tasksUpdate: (id, patch) => invoke("tasks:update", { id, patch }),
  tasksDelete: (id) => invoke("tasks:delete", { id }),

  eventsList: () => invoke("events:list"),
  eventsListUpcoming: () => invoke("events:listUpcoming"),
  eventsCreate: (payload) => invoke("events:create", payload),
  eventsUpdate: (id, patch) => invoke("events:update", { id, patch }),
  eventsDelete: (id) => invoke("events:delete", { id }),

  plannerChat: (text) => invoke("planner:chat", { text }),
  plannerHistory: () => invoke("planner:history"),
  plannerReset: () => invoke("planner:reset"),
};

contextBridge.exposeInMainWorld("api", api);
