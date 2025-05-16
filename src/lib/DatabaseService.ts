import db from "@/db";
import { usersTable } from "@/db/schema";
import { TreeUser } from "@/types";
import { eq } from "drizzle-orm";

export default class DatabaseService {
  /**
   * Fetches user data from the database
   */
  async fetchUserData(userId: string): Promise<TreeUser> {
    const userData = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        leftUser: usersTable.leftUser,
        rightUser: usersTable.rightUser,
        sponsor: usersTable.sponsor,
        redeemedTimes: usersTable.redeemedTimes,
        associatedUsersCount: usersTable.associatedUsersCount,
        associatedActiveUsersCount: usersTable.associatedActiveUsersCount,
        isBlocked: usersTable.isBlocked,
        isActive: usersTable.isActive,
        wallet: usersTable.wallet,
        position: usersTable.position,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!userData[0]) throw new Error(`User with ID ${userId} not found`);
    return userData[0] as TreeUser;
  }
}
