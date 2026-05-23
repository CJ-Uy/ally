import { GoogleGenAI } from "@google/genai";

import { config } from "./config.js";
import { extractJsonFromText, getGeminiText } from "./utils/jsonUtils.js";

let client = null;

const getClient = () => {
  if (!client) {
    client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }

  return client;
};

export const callGeminiJson = async ({ systemPrompt, input, fallback }) => {
  if (config.demoMode) {
    return fallback;
  }

  if (!config.geminiApiKey) {
    const error = new Error(
      "GEMINI_API_KEY is required when DEMO_MODE=false. Add it to the backend .env file or set DEMO_MODE=true for deterministic mock responses."
    );
    error.status = 400;
    throw error;
  }

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: JSON.stringify(input, null, 2)
            }
          ]
        }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json"
      }
    });

    const text = getGeminiText(response);
    const parsed = extractJsonFromText(text);

    if (parsed) {
      return parsed;
    }

    return {
      ...fallback,
      warning:
        "Gemini returned malformed JSON. The backend returned a deterministic fallback response instead."
    };
  } catch (error) {
    if (error.status === 400) {
      throw error;
    }

    return {
      ...fallback,
      warning:
        "Gemini request failed. The backend returned a deterministic fallback response instead.",
      geminiError: error.message
    };
  }
};
