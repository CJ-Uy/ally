import dotenv from "dotenv";

dotenv.config();

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

const parseOrigins = (value) => {
  if (!value) {
    return ["http://localhost:5173", "http://localhost:3000"];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const config = {
  port: Number(process.env.PORT || 3001),
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  demoMode: parseBoolean(process.env.DEMO_MODE, true),
  allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS)
};

export const DEFAULT_STUDENT_ID = "demo-student-001";
