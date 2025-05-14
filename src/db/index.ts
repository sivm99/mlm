import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";
import * as schema from "./schema";
const client = new SQL(process.env.DATABASE_URL!);
const db = drizzle(client, {
  schema,
  logger: true,
});

export default db;
