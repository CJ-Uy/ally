import { useCallback, useEffect, useState } from "react";

type Listener = () => void;

class Bus {
  private listeners = new Set<Listener>();
  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  notify() {
    for (const l of this.listeners) l();
  }
}

export const dataBus = new Bus();

function useReload<T>(loader: () => Promise<T>, initial: T): [T, () => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loading, setLoading] = useState(false);
  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    loader()
      .then((v) => {
        if (!cancelled) setValue(v);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loader]);
  useEffect(() => {
    reload();
    const unsub = dataBus.subscribe(() => reload());
    return () => {
      unsub();
    };
  }, [reload]);
  return [value, reload, loading];
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

export function refreshAll() {
  dataBus.notify();
}
