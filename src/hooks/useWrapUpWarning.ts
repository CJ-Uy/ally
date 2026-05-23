import { useEffect, useState } from "react";

interface WarningState {
  visible: boolean;
  kind: "focus" | "break" | null;
  secondsLeft: number;
}

interface UseWrapUpOptions {
  snap: SessionStateSnapshot | null;
  focusMinutes: number;
}

const WARNING_THRESHOLD_MS = 30_000;

export function useWrapUpWarning({ snap, focusMinutes }: UseWrapUpOptions) {
  const [warning, setWarning] = useState<WarningState>({
    visible: false,
    kind: null,
    secondsLeft: 0,
  });
  const [acknowledgedFocusKey, setAckFocus] = useState<string | null>(null);
  const [acknowledgedBreakKey, setAckBreak] = useState<string | null>(null);

  useEffect(() => {
    if (!snap) {
      setWarning({ visible: false, kind: null, secondsLeft: 0 });
      return;
    }

    if (snap.break.active) {
      const ms = snap.break.msRemaining;
      const breakKey = `b:${snap.break.forKeyword ?? "anon"}`;
      if (ms > 0 && ms <= WARNING_THRESHOLD_MS && acknowledgedBreakKey !== breakKey) {
        setWarning({ visible: true, kind: "break", secondsLeft: Math.ceil(ms / 1000) });
        return;
      }
      if (ms > WARNING_THRESHOLD_MS) {
        if (acknowledgedBreakKey !== null) setAckBreak(null);
      }
      setWarning((w) => (w.kind === "break" ? { ...w, visible: false } : w));
      return;
    }

    if (snap.session.active && !snap.session.paused) {
      const targetMs = focusMinutes * 60_000;
      const remaining = targetMs - snap.session.elapsedMs;
      // Use the focus phase number as key so we can re-fire per pomodoro
      const phaseNumber = Math.floor(snap.session.elapsedMs / targetMs);
      const focusKey = `f:${phaseNumber}`;
      if (
        remaining > 0 &&
        remaining <= WARNING_THRESHOLD_MS &&
        acknowledgedFocusKey !== focusKey
      ) {
        setWarning({ visible: true, kind: "focus", secondsLeft: Math.ceil(remaining / 1000) });
        return;
      }
      if (remaining > WARNING_THRESHOLD_MS) {
        if (acknowledgedFocusKey === focusKey) setAckFocus(null);
      }
      setWarning((w) => (w.kind === "focus" ? { ...w, visible: false } : w));
      return;
    }

    setWarning({ visible: false, kind: null, secondsLeft: 0 });
  }, [snap, focusMinutes, acknowledgedFocusKey, acknowledgedBreakKey]);

  const dismiss = () => {
    if (!snap) return;
    if (warning.kind === "break") {
      setAckBreak(`b:${snap.break.forKeyword ?? "anon"}`);
    } else if (warning.kind === "focus") {
      const targetMs = focusMinutes * 60_000;
      const phaseNumber = Math.floor(snap.session.elapsedMs / targetMs);
      setAckFocus(`f:${phaseNumber}`);
    }
    setWarning((w) => ({ ...w, visible: false }));
  };

  return { warning, dismiss };
}
