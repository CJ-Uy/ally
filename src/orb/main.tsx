import React from "react";
import ReactDOM from "react-dom/client";
import { Orb } from "./Orb";
import "./orb.css";

ReactDOM.createRoot(document.getElementById("orb-root")!).render(
  <React.StrictMode>
    <Orb />
  </React.StrictMode>,
);
