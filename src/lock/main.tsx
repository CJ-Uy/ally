import React from "react";
import ReactDOM from "react-dom/client";
import { Lock } from "./Lock";
import "./lock.css";

ReactDOM.createRoot(document.getElementById("lock-root")!).render(
  <React.StrictMode>
    <Lock />
  </React.StrictMode>,
);
