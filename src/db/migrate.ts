import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { SQL } from "bun";
const client = new SQL(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle({ client });

async function main() {
  await migrate(db, {
    migrationsFolder: "./drizzle/migrations",
  });
  await db.$client.end();
}

main();
