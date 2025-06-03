import { drizzle } from "drizzle-orm/bun-sql";
import { seedBinaryTree } from "./seedHelper";

const client = new Bun.SQL(Bun.env.DATABASE_URL!, { max: 1 });
const db = drizzle({ client });

// Main seed function
async function seed() {
  try {
    await seedBinaryTree(db);
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await db.$client.end();
  }
}

seed().catch(console.error);
