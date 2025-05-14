import { defineConfig } from "drizzle-kit";
export default defineConfig({
  out: "./drizzle/migrations",
  schema: "./src/db/schema",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
