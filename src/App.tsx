import { useEffect, useState } from "react";
import { Onboarding } from "./onboarding/Onboarding";
import { Dashboard } from "./dashboard/Dashboard";
import "./App.css";

type AppState = "loading" | "onboarding" | "dashboard";

function App() {
  const [state, setState] = useState<AppState>("loading");

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await window.api.schemaBootstrap();
        const profile = await window.api.profileGet();
        if (cancelled) return;
        setState(profile ? "dashboard" : "onboarding");
      } catch (err) {
        console.error("[app] bootstrap failed:", err);
        if (!cancelled) setState("onboarding");
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="app-loading">
        <span className="app-loading__mark">A</span>
        <p>preparing your study room…</p>
      </div>
    );
  }

  if (state === "onboarding") {
    return <Onboarding onDone={() => setState("dashboard")} />;
  }

  return <Dashboard />;
}

export default App;
