import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const clipsDir = join(root, "out", "clips");
const clips = JSON.parse(
  readFileSync(join(root, "src", "data", "appClips.json"), "utf8"),
);

rmSync(clipsDir, { recursive: true, force: true });
mkdirSync(clipsDir, { recursive: true });

for (const { id } of clips) {
  const output = join(clipsDir, `${id}.mp4`);
  const result = spawnSync(
    "npx",
    ["remotion", "render", "src/index.ts", id, output],
    {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
    },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
