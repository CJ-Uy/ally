import react from "@vitejs/plugin-react";
import { chromium } from "playwright";
import { createServer } from "vite";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const demoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const projectRoot = dirname(demoRoot);
const captureDir = join(demoRoot, "captures", "app-screens");
const publicCaptureDir = join(demoRoot, "public", "captures", "app-screens");
const port = 5174;
const baseUrl = `http://127.0.0.1:${port}`;

process.env.ALLY_DEMO_CAPTURE = "1";
process.env.VITE_ALLY_DEMO_CAPTURE = "1";

await rm(captureDir, { recursive: true, force: true });
await rm(publicCaptureDir, { recursive: true, force: true });
await mkdir(captureDir, { recursive: true });
await mkdir(publicCaptureDir, { recursive: true });

const server = await createServer({
  root: projectRoot,
  configFile: false,
  publicDir: join(projectRoot, "public"),
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port,
    strictPort: true,
  },
});

await server.listen();

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});

await context.addInitScript(() => {
  localStorage.setItem(
    "ally:session-goals",
    JSON.stringify([
      {
        id: "demo-goal-1",
        title: "Finish Biology Lab Report",
        estimatedPomodoros: 2,
        completed: false,
      },
      {
        id: "demo-goal-2",
        title: "Review Linear Algebra problem set",
        estimatedPomodoros: 1,
        completed: false,
      },
    ]),
  );
  localStorage.setItem(
    "ally:blocklist",
    JSON.stringify(["tiktok.com", "instagram.com", "games"]),
  );
});

const page = await context.newPage();

async function settle() {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(250);
}

async function shot(name) {
  await settle();
  const capturePath = join(captureDir, name);
  const publicPath = join(publicCaptureDir, name);
  await page.screenshot({ path: capturePath, fullPage: false });
  await copyFile(capturePath, publicPath);
  console.log(`captured ${name}`);
}

async function goto(path) {
  await page.goto(`${baseUrl}${path}`);
  await settle();
}

try {
  await goto("/?demo=onboarding");
  await page.getByText("Let's plan your").waitFor();
  await shot("01-onboarding-profile-01.png");

  await page.getByRole("button", { name: /Begin/ }).click();
  await page.getByText("How many hours").waitFor();
  await shot("01-onboarding-profile-02.png");

  await page.getByRole("button", { name: /Next/ }).click();
  await page.getByText("What level of school").waitFor();
  await shot("01-onboarding-profile-03.png");

  await page.getByRole("button", { name: /Next/ }).click();
  await page.getByText("Name the subjects").waitFor();
  const subjectInputs = page.locator(".onb__subjectinput");
  await subjectInputs.nth(0).fill("Linear Algebra");
  await subjectInputs.nth(1).fill("Biology 12");
  await subjectInputs.nth(2).fill("Management Narratives");
  await shot("02-syllabus-upload-01.png");

  await page.getByRole("button", { name: /Next/ }).click();
  await page.getByText("Attach the syllabus").waitFor();
  while ((await page.getByRole("button", { name: "Choose PDF" }).count()) > 0) {
    await page.getByRole("button", { name: "Choose PDF" }).first().click();
  }
  await page.getByText("Management Narratives Syllabus.pdf").waitFor();
  await shot("02-syllabus-upload-02.png");

  await page.getByRole("button", { name: /Parse syllabi/ }).click();
  await page.getByText("Just a moment").waitFor();
  await shot("03-syllabus-review-01.png");

  await page.getByText("Confirm and we'll save it", { exact: false }).waitFor();
  await shot("03-syllabus-review-02.png");

  await page.getByRole("button", { name: /Save plan/ }).click();
  await page.locator(".pretest__choice").first().waitFor();
  await shot("04-diagnostic-pretest-01.png");
  const questions = page.locator(".pretest__q");
  const questionCount = await questions.count();
  for (let i = 0; i < questionCount; i++) {
    await questions.nth(i).locator(".pretest__choice").nth(1).click();
  }
  await page.getByRole("button", { name: /Save & continue/ }).click();
  await page.locator(".pretest__result").waitFor();
  await shot("04-diagnostic-pretest-02.png");

  await goto("/?demo=shell");
  const sidebar = page.locator(".sidebar-nav");
  await sidebar.getByRole("button", { name: "Subjects" }).click();
  await page.getByText("Where you are, in each").waitFor();
  await shot("05-subjects-01.png");

  await sidebar.getByRole("button", { name: "Tasks" }).click();
  await page.getByText("Everything to do").waitFor();
  await shot("06-tasks-01.png");

  await sidebar.getByRole("button", { name: "Calendar" }).click();
  await page.getByText("Your calendar").waitFor();
  await shot("07-calendar-01.png");

  await sidebar.getByRole("button", { name: "Today" }).click();
  await page.getByText("Needs attention").waitFor();
  await shot("08-today-risk-01.png");

  await goto("/?demo=shell&session=active");
  await page.getByText("Pomodoro").waitFor();
  await shot("09-focus-session-01.png");

  await page.getByRole("button", { name: "End session" }).click();
  await page.getByText("Good work today").waitFor();
  await shot("11-session-reflection-01.png");

  await goto("/lock.html?demo=lock");
  await page.getByText("TikTok is blocked").waitFor();
  await shot("10-lock-backout-01.png");
  await page.locator("textarea").fill("I need a break. Can I skip tonight?");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByText("Take 15 minutes", { exact: false }).waitFor();
  await shot("10-lock-backout-02.png");

  await goto("/?demo=shell");
  await page.getByText("Ready when you are").waitFor();
  await shot("12-dashboard-01.png");
} finally {
  await browser.close();
  await server.close();
}
