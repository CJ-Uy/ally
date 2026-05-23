import { useCallback, useEffect, useRef, useState } from "react";

type Listener = () => void;

class Bus {
  private listeners = new Set<Listener>();
  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  notify() {
    for (const l of this.listeners) l();
  }
}

export const dataBus = new Bus();

interface ReloadResult<T> {
  value: T;
  reload: () => Promise<void>;
  loading: boolean;
  error: Error | null;
}

function useReload<T>(loader: () => Promise<T>, initial: T): [
  T,
  () => Promise<void>,
  ReloadResult<T>,
] {
  const [value, setValue] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const v = await loaderRef.current();
      setValue(v);
    } catch (err) {
      console.error("[useReload] failed:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    return dataBus.subscribe(() => {
      void reload();
    });
  }, [reload]);

  return [value, reload, { value, reload, loading, error }];
}

export function useProfile() {
  return useReload<UserProfileDto | null>(
    () => window.api.profileGet(),
    null,
  );
}

export function useSubjects() {
  return useReload<SubjectDto[]>(() => window.api.subjectsList(), []);
}

export function useTasks() {
  return useReload<TaskDto[]>(() => window.api.tasksList(), []);
}

export function useEvents() {
  return useReload<CalendarEventDto[]>(() => window.api.eventsList(), []);
}

export function useTodayTasks() {
  return useReload<TaskDto[]>(() => window.api.tasksListToday(), []);
}

export function useUpcomingEvents() {
  return useReload<CalendarEventDto[]>(
    () => window.api.eventsListUpcoming(),
    [],
  );
}

export function useAtRiskTasks() {
  return useReload<AtRiskItemDto[]>(() => window.api.tasksAtRisk(), []);
}

export function refreshAll() {
  dataBus.notify();
}
