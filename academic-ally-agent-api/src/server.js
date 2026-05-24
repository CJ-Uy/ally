import cors from "cors";
import express from "express";

import { config } from "./config.js";
import { chatRouter } from "./routes/chatRoutes.js";
import { stateRouter } from "./routes/stateRoutes.js";
import { workflowRouter } from "./routes/workflowRoutes.js";
import { errorResponse, successResponse } from "./utils/responseUtils.js";

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    }
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.json(
    successResponse({
      module: "Academic Ally Agent API",
      message: "Academic Ally backend is running. Use /api/health for status or /api endpoints for the Electron app.",
      data: {
        status: "ok",
        healthUrl: "/api/health",
        apiBaseUrl: "/api",
        demoMode: config.demoMode,
        providerRouting: "ollama-first",
        ollamaModel: config.ollamaModel,
        geminiModel: config.geminiModel
      },
      state: {}
    })
  );
});

app.get("/api/health", (req, res) => {
  res.json(
    successResponse({
      module: "Academic Ally Agent API",
      message: "Academic Ally backend is running.",
      data: {
        status: "ok",
        demoMode: config.demoMode,
        providerRouting: "ollama-first",
        ollamaUrlConfigured: Boolean(config.ollamaUrl),
        ollamaModel: config.ollamaModel,
        geminiModel: config.geminiModel,
        port: config.port
      },
      state: {}
    })
  );
});

app.use("/api", chatRouter);
app.use("/api", stateRouter);
app.use("/api", workflowRouter);

app.use((req, res) => {
  res.status(404).json(
    errorResponse({
      module: "Academic Ally Agent API",
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      error: {
        status: 404
      }
    })
  );
});

app.use((error, req, res, next) => {
  const status = error.status || 500;

  res.status(status).json(
    errorResponse({
      module: "Academic Ally Agent API",
      message: error.message || "Unexpected backend error.",
      error: {
        status,
        name: error.name,
        message: error.message
      }
    })
  );
});

app.listen(config.port, "127.0.0.1", () => {
  console.log(`Academic Ally Agent API running on http://localhost:${config.port}`);
  console.log(
    `DEMO_MODE=${config.demoMode} | OLLAMA_MODEL=${config.ollamaModel} | GEMINI_MODEL=${config.geminiModel}`
  );
});
