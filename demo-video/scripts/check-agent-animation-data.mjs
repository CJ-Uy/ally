import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(rootDir, "src/data/agentArchitecture.json");

let data;
try {
  data = JSON.parse(readFileSync(dataPath, "utf8"));
} catch (error) {
  console.error(`Unable to read ${dataPath}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const requiredAgents = [
  "Student Profile & Onboarding Agent",
  "Syllabus & Course Intelligence Agent",
  "Learner Diagnostic Agent",
  "Workload Planning Agent",
  "Execution & Accountability Agent",
];

const failures = [];

if (data.title !== "Academic Ally Agent Architecture") {
  failures.push("title must be Academic Ally Agent Architecture");
}

if (data.orchestrator?.name !== "Academic Ally Parent Orchestrator") {
  failures.push("orchestrator name must match the script");
}

if (!Array.isArray(data.agents) || data.agents.length !== 5) {
  failures.push("agent architecture must contain exactly five specialist agents");
} else {
  for (const name of requiredAgents) {
    const agent = data.agents.find((entry) => entry.name === name);
    if (!agent) {
      failures.push(`missing specialist agent: ${name}`);
      continue;
    }

    if (!Array.isArray(agent.responsibilities) || agent.responsibilities.length < 3) {
      failures.push(`${name} needs at least three responsibilities`);
    }

    if (typeof agent.exampleOutput !== "string" || agent.exampleOutput.length < 10) {
      failures.push(`${name} needs an example output`);
    }
  }
}

if (!Array.isArray(data.guardrails) || data.guardrails.length < 3) {
  failures.push("guardrails must include confirmation, uncertainty, and routing accuracy concepts");
}

if (!Array.isArray(data.flow) || data.flow.join(">").indexOf("Student>Academic Ally Parent Orchestrator") !== 0) {
  failures.push("flow must begin with Student > Academic Ally Parent Orchestrator");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Agent animation data verified.");
