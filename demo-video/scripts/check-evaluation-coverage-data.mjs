import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const data = JSON.parse(readFileSync(join(root, "src", "data", "evaluationCoverage.json"), "utf8"));
const failures = [];
const expectedTotalTestCases = 53;

if (data.summary.totalTestCases !== expectedTotalTestCases) {
  failures.push(`summary.totalTestCases must be ${expectedTotalTestCases}`);
}

if (!Array.isArray(data.categories) || data.categories.length !== data.summary.categoryCount) {
  failures.push("categories length must match summary.categoryCount");
}

const categoryTotal = (data.categories ?? []).reduce((sum, category) => sum + Number(category.count ?? 0), 0);
if (categoryTotal !== data.summary.totalTestCases) {
  failures.push(`category counts must sum to ${data.summary.totalTestCases}, received ${categoryTotal}`);
}

for (const category of data.categories ?? []) {
  if (!category.name || !category.shortName || !category.accent || !category.testedBehavior) {
    failures.push(`${category.name ?? "unknown category"} is missing name, shortName, accent, or testedBehavior`);
  }
  if (!Array.isArray(category.features) || category.features.length === 0) {
    failures.push(`${category.name ?? "unknown category"} must include at least one mapped feature`);
  }
}

if (!Array.isArray(data.promptFlows) || data.promptFlows.length !== 3) {
  failures.push("promptFlows must include exactly three representative flows");
}

for (const flow of data.promptFlows ?? []) {
  if (!flow.label || !flow.prompt || !flow.route || !flow.validatedFeature) {
    failures.push(`${flow.label ?? "unknown flow"} is missing label, prompt, route, or validatedFeature`);
  }
}

if (!Array.isArray(data.featureChecklist) || data.featureChecklist.length < 8) {
  failures.push("featureChecklist must include at least eight feature labels");
}

if (!data.handoff?.title || !data.handoff?.subtitle) {
  failures.push("handoff must include title and subtitle");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `Evaluation coverage data verified: ${data.summary.totalTestCases} tests across ${data.categories.length} categories.`,
);
