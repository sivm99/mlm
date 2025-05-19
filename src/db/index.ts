import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";
import * as schema from "./schema";
const client = new SQL(process.env.DATABASE_URL!);
const isDev = process.env.NODE_ENV === "development" ? true : false;
const db = drizzle(client, {
  schema,
  logger: isDev,
});

export default db;
