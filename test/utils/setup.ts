// import { drizzle } from "drizzle-orm/bun-sql";

// const testClient = new Bun.SQL(Bun.env.TEST_DATABASE_URL!);
// const db = drizzle(testClient, {
//   schema,
//   logger: true,
// });

// // Helper to reset tables before each test
// export async function resetDB() {
//   await db.execute(
//     `TRUNCATE TABLE users, transactions RESTART IDENTITY CASCADE;`,
//   );
// }
