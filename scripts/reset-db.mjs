import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error(
    "Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env. Aborting.",
  );
  process.exit(1);
}

const client = createClient({ url, authToken });

// Order matters: drop child tables first so FK references don't complain.
const TABLES = ["tasks", "events", "syllabi", "subjects", "user_profile"];

console.log("Resetting Ally database…");

for (const table of TABLES) {
  try {
    await client.execute(`DROP TABLE IF EXISTS ${table}`);
    console.log(`  ✓ dropped ${table}`);
  } catch (err) {
    console.error(`  ✗ failed on ${table}:`, err.message);
    process.exitCode = 1;
  }
}

console.log("\nDone. Restart the app — it'll rebuild empty tables and");
console.log("send you back to onboarding.");
