import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clips = JSON.parse(readFileSync(path.join(rootDir, "src/data/appClips.json"), "utf8"));

const failures = [];

for (const clip of clips) {
  if (!clip.motion || typeof clip.motion !== "object") {
    failures.push(`${clip.id}: missing motion metadata`);
    continue;
  }

  if (!Array.isArray(clip.motion.camera) || clip.motion.camera.length < 2) {
    failures.push(`${clip.id}: needs at least two camera keyframes`);
  }

  if (!Array.isArray(clip.motion.cursor) || clip.motion.cursor.length < 2) {
    failures.push(`${clip.id}: needs at least two cursor keyframes`);
  }

  const hasAction =
    Array.isArray(clip.motion.clicks) && clip.motion.clicks.length > 0
      ? true
      : Array.isArray(clip.motion.highlights) && clip.motion.highlights.length > 0;

  if (!hasAction) {
    failures.push(`${clip.id}: needs at least one click or highlight action`);
  }

  if (clip.motion.captureStarts !== undefined) {
    const starts = clip.motion.captureStarts;
    if (
      !Array.isArray(starts) ||
      starts.length !== clip.captures.length ||
      starts[0] !== 0 ||
      starts.some((value, index) => typeof value !== "number" || value < 0 || value > 1 || (index > 0 && value <= starts[index - 1]))
    ) {
      failures.push(`${clip.id}: captureStarts must be sorted normalized values beginning at 0 and matching captures`);
    }
  }

  for (const point of clip.motion.cursor ?? []) {
    if (
      typeof point.at !== "number" ||
      typeof point.x !== "number" ||
      typeof point.y !== "number" ||
      point.at < 0 ||
      point.at > 1 ||
      point.x < 0 ||
      point.x > 1 ||
      point.y < 0 ||
      point.y > 1
    ) {
      failures.push(`${clip.id}: cursor keyframes must use normalized x/y/at values`);
      break;
    }
  }

  for (const point of clip.motion.camera ?? []) {
    if (
      typeof point.at !== "number" ||
      typeof point.x !== "number" ||
      typeof point.y !== "number" ||
      typeof point.scale !== "number" ||
      point.at < 0 ||
      point.at > 1 ||
      point.x < 0 ||
      point.x > 1 ||
      point.y < 0 ||
      point.y > 1 ||
      point.scale < 1 ||
      point.scale > 1.2
    ) {
      failures.push(`${clip.id}: camera keyframes must use normalized x/y/at and scale 1-1.2`);
      break;
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Motion metadata verified for ${clips.length} clips.`);
