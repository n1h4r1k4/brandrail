import { defineConfig } from "drizzle-kit";

// Used only to generate SQL migrations (npm run db:generate).
// The app applies them itself at runtime from src/lib/db/migrations.generated.ts.
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
});
