import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Replace this example table with your own schema.
export const example = sqliteTable("example", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
