import { useState } from "react";
import "./App.css";

type R2Object = { key: string; size: number; etag?: string };

function App() {
  const [ping, setPing] = useState("idle");
  const [dbStatus, setDbStatus] = useState<"idle" | "ok" | "error">("idle");
  const [r2Objects, setR2Objects] = useState<R2Object[]>([]);
  const [prefix, setPrefix] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handlePing = async () => {
    setError(null);
    try {
      const result = await window.api.ping();
      setPing(result);
    } catch (err) {
      setPing("error");
      setError(err instanceof Error ? err.message : "Ping failed");
    }
  };

  const handleDbHealth = async () => {
    setError(null);
    try {
      await window.api.dbHealth();
      setDbStatus("ok");
    } catch (err) {
      setDbStatus("error");
      setError(err instanceof Error ? err.message : "DB check failed");
    }
  };

  const handleR2List = async () => {
    setError(null);
    try {
      const result = await window.api.r2List(prefix || undefined);
      setR2Objects(result.objects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "R2 list failed");
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark">A</span>
          <span>Ally</span>
        </div>
        <nav className="nav">
          <button className="nav__item nav__item--active" type="button">
            Dashboard
          </button>
          <button className="nav__item" type="button">
            Files
          </button>
          <button className="nav__item" type="button">
            Sync
          </button>
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Electron window mock</p>
            <h1>Ally Desktop</h1>
          </div>
          <span className="badge">Dev build</span>
        </header>

        <section className="hero-panel">
          <div>
            <p className="eyebrow">Native shell is running</p>
            <h2>This is the desktop app window.</h2>
            <p>
              React is rendering inside Electron. These controls talk to the
              preload bridge.
            </p>
          </div>
          <div className="signal">
            <span>Window</span>
            <strong>Open</strong>
          </div>
        </section>

        <div className="panel-grid">
          <section className="panel">
            <h3>Health Checks</h3>
            <div className="app__actions">
              <button type="button" onClick={handlePing}>
                Ping Electron
              </button>
              <button type="button" onClick={handleDbHealth}>
                Check DB
              </button>
            </div>
            <div className="status-row">
              <span>Ping: {ping}</span>
              <span>DB: {dbStatus}</span>
            </div>
          </section>

          <section className="panel">
            <h3>R2 Objects</h3>
            <div className="app__actions">
              <input
                value={prefix}
                onChange={(event) => setPrefix(event.target.value)}
                placeholder="Prefix (optional)"
              />
              <button type="button" onClick={handleR2List}>
                List
              </button>
            </div>
            <ul className="app__list">
              {r2Objects.length === 0 ? (
                <li className="app__muted">No objects loaded</li>
              ) : (
                r2Objects.map((obj) => (
                  <li key={obj.key}>
                    <span>{obj.key}</span>
                    <span className="app__muted">{obj.size} bytes</span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>

        {error ? <p className="app__error">{error}</p> : null}
      </main>
    </div>
  );
}

export default App;
