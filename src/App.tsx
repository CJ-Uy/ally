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
    <div className="app">
      <header className="app__header">
        <h1>Ally Desktop</h1>
        <p>Turso + Drizzle + R2 (Electron)</p>
      </header>

      <section className="app__card">
        <h2>Health checks</h2>
        <div className="app__actions">
          <button type="button" onClick={handlePing}>
            Ping
          </button>
          <button type="button" onClick={handleDbHealth}>
            Check DB
          </button>
        </div>
        <div className="app__status">
          <span>Ping: {ping}</span>
          <span>DB: {dbStatus}</span>
        </div>
      </section>

      <section className="app__card">
        <h2>R2 list</h2>
        <div className="app__actions">
          <input
            value={prefix}
            onChange={(event) => setPrefix(event.target.value)}
            placeholder="Prefix (optional)"
          />
          <button type="button" onClick={handleR2List}>
            List objects
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

      {error ? <p className="app__error">{error}</p> : null}
    </div>
  );
}

export default App;
