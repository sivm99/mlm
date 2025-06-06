import { drizzle } from "drizzle-orm/bun-sql";
import { seedBinaryTree } from "./seedHelper";
import { seedAdminOnly } from "./seedHelper2";

const client = new Bun.SQL(Bun.env.DATABASE_URL!, { max: 1 });
const db = drizzle({ client });

// Main seed function
async function seed() {
  try {
    console.log(
      "Do you want to seed the full tree or admin only? (full/admin)",
    );

    // Using console as an AsyncIterable for stdin in Bun
    for await (const line of console) {
      const choice = line.trim().toLowerCase();

      if (choice === "full") {
        console.log("Seeding full binary tree...");
        await seedBinaryTree(db);
        break;
      } else if (choice === "admin") {
        console.log("Seeding admin only...");
        await seedAdminOnly(db);
        break;
      } else {
        console.log("Invalid choice. Please enter 'full' or 'admin':");
      }
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await db.$client.end();
  }
}

seed().catch(console.error);
