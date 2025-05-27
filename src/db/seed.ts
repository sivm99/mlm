import { drizzle } from "drizzle-orm/bun-sql";
import { env, password, SQL } from "bun";
import {
  InsertTree,
  InsertUser,
  InsertWallet,
  treeTable,
  usersTable,
  walletsTable,
} from "./schema";
import { adminId } from ".";

const client = new SQL(env.DATABASE_URL!, { max: 1 });
const db = drizzle({ client });

const adminEmail = env.ADMIN_EMAIL || "admin@example.com";
async function seed() {
  try {
    const adminUser: InsertUser = {
      id: adminId,
      name: "Master",
      mobile: "9999999999",
      email: adminEmail,
      country: "Global",
      dialCode: "+1",
      role: "ADMIN",
      isActive: true,
      passwordHash: await password.hash(process.env.ADMIN_PASSWORD!),
    };
    const adminWallet: InsertWallet = {
      id: adminId,
    };

    const treeUser: InsertTree = {
      id: adminId,
      sponsor: adminId,
      position: "LEFT",
      parentUser: adminId,
    };
    // Insert admin user
    console.log("Adding the admin");
    await db.insert(usersTable).values(adminUser).onConflictDoNothing();
    console.log("Adding the admin wallet");
    await db.insert(walletsTable).values(adminWallet).onConflictDoNothing();
    console.log("Adding the admin into the tree");
    await db.insert(treeTable).values(treeUser).onConflictDoNothing();
    console.log("Admin user seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await db.$client.end();
  }
}

seed().catch(console.error);
