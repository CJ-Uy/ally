import { useEffect, useState } from "react";

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

export const DEFAULT_POMODORO: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
};

export const DEFAULT_BLOCKLIST: string[] = [
  "tiktok.com",
  "youtube.com",
  "instagram.com",
  "reddit.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "netflix.com",
];

const POMODORO_KEY = "ally:pomodoro";
const BLOCKLIST_KEY = "ally:blocklist";

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function usePomodoroSettings() {
  const [settings, setSettings] = useState<PomodoroSettings>(() =>
    readJSON(POMODORO_KEY, DEFAULT_POMODORO),
  );

  useEffect(() => {
    localStorage.setItem(POMODORO_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = (patch: Partial<PomodoroSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const reset = () => setSettings(DEFAULT_POMODORO);

  return { settings, update, reset };
}

export function useBlocklist() {
  const [items, setItems] = useState<string[]>(() =>
    readJSON(BLOCKLIST_KEY, DEFAULT_BLOCKLIST),
  );

  useEffect(() => {
    localStorage.setItem(BLOCKLIST_KEY, JSON.stringify(items));
  }, [items]);

  const add = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return;
    setItems((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
  };
  const remove = (value: string) =>
    setItems((prev) => prev.filter((x) => x !== value));
  const reset = () => setItems(DEFAULT_BLOCKLIST);

  return { items, add, remove, reset };
}
