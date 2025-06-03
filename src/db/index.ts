import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

const client = new Bun.SQL(process.env.DATABASE_URL!);

const isDev = Bun.env.NODE_ENV === "development" ? true : false;
const db = drizzle(client, {
  schema,
  logger: isDev,
});

export default db;
export const adminId = 1_000_001;
