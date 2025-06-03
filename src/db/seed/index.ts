import { drizzle } from "drizzle-orm/bun-sql";
import {
  createAdminUserData,
  createLevel1UserData,
  createLevel2UserData,
  createLevel3UserData,
  generateUserIds,
  insertUserData,
  updateTreeReferences,
} from "./seedHelper";

const client = new Bun.SQL(Bun.env.DATABASE_URL!, { max: 1 });
const db = drizzle({ client });

// Main seed function
async function seed() {
  try {
    // Generate all IDs
    const ids = await generateUserIds();

    // Create user data for each level
    const adminData = await createAdminUserData();
    const level1Data = await createLevel1UserData(ids);
    const level2Data = await createLevel2UserData({
      ...ids,
      ...level1Data.ids,
    });
    const level3Data = await createLevel3UserData(ids);

    // Insert data into database
    await insertUserData(
      [adminData.adminUser],
      [adminData.adminWallet],
      [adminData.adminTree],
      "the admin",
    );

    await insertUserData(
      level1Data.users,
      level1Data.wallets,
      level1Data.trees,
      "Level 1 users",
    );

    await insertUserData(
      level2Data.users,
      level2Data.wallets,
      level2Data.trees,
      "Level 2 users",
    );

    await insertUserData(
      [...level3Data.mainUsers, ...level3Data.additionalUsers],
      [...level3Data.mainWallets, ...level3Data.additionalWallets],
      [...level3Data.mainTrees, ...level3Data.additionalTrees],
      "Level 3 users",
    );

    console.log("All tree data seeded successfully!");

    // Update tree references
    await updateTreeReferences(ids);
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await db.$client.end();
  }
}

seed().catch(console.error);
