// import { eq } from "drizzle-orm";
import {
  InsertProduct,
  InsertTree,
  InsertUser,
  productsTable,
  treeTable,
  usersTable,
  walletsTable,
  userStatsTable,
} from "../schema";
import { BunSQLDatabase } from "drizzle-orm/bun-sql";
import { adminId } from "..";

const adminEmail = Bun.env.ADMIN_EMAIL || "admin@example.com";

// Create admin user
async function createAdminUser(): Promise<InsertUser> {
  const admin: InsertUser = {
    id: adminId,
    name: "Master Admin",
    image: "https://cool.s3.n3y.in/admin.jpeg",
    email: adminEmail,
    mobile: "9999999999",
    country: "Global",
    dialCode: "+1",
    isActive: true,
    role: "admin",
    passwordHash: await Bun.password.hash(Bun.env.ADMIN_PASSWORD!),
  };

  return admin;
}

// Create admin tree entry
function createAdminTree(): InsertTree {
  const adminTree: InsertTree = {
    id: adminId,
    sponsor: adminId, // Admin sponsors self
    parentUser: adminId, // Admin is own parent
    position: "left", // Default position
  };

  return adminTree;
}

// Main seeding function for admin only
export async function seedAdminOnly(db: BunSQLDatabase) {
  try {
    console.log("🌱 Starting admin-only seeding...");

    // 1. Create and insert admin user
    console.log("👤 Creating admin user...");
    const adminUser = await createAdminUser();
    await db.insert(usersTable).values(adminUser).onConflictDoNothing();

    // 2. Insert admin wallet (just ID needed)
    console.log("💰 Creating admin wallet...");
    await db.insert(walletsTable).values({ id: adminId }).onConflictDoNothing();

    // 3. Insert admin user stats (just ID needed)
    console.log("📊 Creating admin user stats...");
    await db
      .insert(userStatsTable)
      .values({ id: adminId })
      .onConflictDoNothing();

    // 4. Create tree entry for admin
    console.log("🌳 Creating admin tree entry...");
    const adminTree = createAdminTree();
    await db.insert(treeTable).values(adminTree).onConflictDoNothing();

    // 5. Insert sample product
    console.log("📦 Adding sample product...");
    await insertProduct(db);

    console.log("✅ Admin seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during admin seeding:", error);
    throw error;
  }
}

export async function insertProduct(db: BunSQLDatabase) {
  const cellogen: InsertProduct = {
    name: "Cellogen",
    price: 52,
    description: "By Alprimus",
  };
  await db.insert(productsTable).values(cellogen).onConflictDoNothing();
}
