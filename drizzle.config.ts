import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Vercel writes pulled env vars to .env.local; fall back to .env if present.
config({ path: ".env.local" });
config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Run `vercel env pull .env.local` first, " +
      "or export DATABASE_URL in your shell.",
  );
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
