import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

afterEach(() => {
  process.env = { ...originalEnv };
  globalThis.fetch = originalFetch;
});

test("callLlmJson tries Ollama before Gemini for JSON calls", async () => {
  process.env.DEMO_MODE = "false";
  process.env.OLLAMA_URL = "http://ollama.test";
  process.env.OLLAMA_MODEL = "qwen3.5:9b";

  const fetchCalls = [];
  globalThis.fetch = async (url, options) => {
    fetchCalls.push({ url, options });
    return {
      ok: true,
      async json() {
        return {
          message: {
            content: JSON.stringify({ source: "ollama", ok: true })
          }
        };
      }
    };
  };

  let geminiCalled = false;
  const { callLlmJson } = await import("./llmClient.js");

  const result = await callLlmJson({
    systemPrompt: "Return JSON.",
    input: { request: "hello" },
    fallback: { source: "fallback" },
    callGemini: async () => {
      geminiCalled = true;
      return { source: "gemini" };
    }
  });

  assert.deepEqual(result, { source: "ollama", ok: true });
  assert.equal(geminiCalled, false);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, "http://ollama.test/api/chat");

  const body = JSON.parse(fetchCalls[0].options.body);
  assert.equal(body.model, "qwen3.5:9b");
  assert.equal(body.format, "json");
  assert.equal(body.messages[0].role, "system");
  assert.equal(body.messages[1].role, "user");
});
