import { drizzle } from "drizzle-orm/bun-sql";
import { password, SQL } from "bun";
import { usersTable } from "./schema";
import { RegisterUser } from "@/validation/auth.validations";
import { User } from "@/types";

const client = new SQL(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle({ client });

async function seed() {
  try {
    console.log("Seeding database...");

    const adminUser: Omit<RegisterUser, "otp"> & {
      id: User["id"];
      role: User["role"];
      passwordHash: User["passwordHash"];
      isActive: true;
      parentUser: User["id"];
    } = {
      id: 1_000_001,
      name: "Master",
      mobile: "9999999999",
      email: "master@1as.in",
      country: "Global",
      dialCode: "+1",
      sponsor: 1_000_001,
      position: "LEFT",
      parentUser: 1_000_001,
      role: "ADMIN",
      password: "",
      isActive: true,
      passwordHash: await password.hash(process.env.ADMIN_PASSWORD!),
    };

    // Insert admin user
    await db.insert(usersTable).values(adminUser).onConflictDoNothing();
    console.log("Admin user seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await db.$client.end();
  }
}

seed().catch(console.error);
