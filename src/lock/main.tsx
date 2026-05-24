import React from "react";
import ReactDOM from "react-dom/client";
import { installDemoApiIfNeeded } from "../demo/demoApi";
import { Lock } from "./Lock";
import "./lock.css";

installDemoApiIfNeeded();

ReactDOM.createRoot(document.getElementById("lock-root")!).render(
  <React.StrictMode>
    <Lock />
  </React.StrictMode>,
);
