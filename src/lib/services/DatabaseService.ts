import db from "@/db";
import { usersTable } from "@/db/schema";
import { User } from "@/types";
import { eq } from "drizzle-orm";

export const safeUserReturn = {
  id: usersTable.id,
  name: usersTable.name,
  mobile: usersTable.mobile,
  email: usersTable.email,
  country: usersTable.country,
  dialCode: usersTable.dialCode,
  image: usersTable.image,

  sponsor: usersTable.sponsor,
  leftUser: usersTable.leftUser,
  rightUser: usersTable.rightUser,
  parentUser: usersTable.parentUser,

  role: usersTable.role,
  permissions: usersTable.permissions,

  isActive: usersTable.isActive,
  isBlocked: usersTable.isBlocked,

  leftCount: usersTable.leftCount,
  rightCount: usersTable.rightCount,
  leftActiveCount: usersTable.leftActiveCount,
  rightActiveCount: usersTable.rightActiveCount,
  leftBv: usersTable.leftBv,
  rightBv: usersTable.rightBv,

  redeemedCount: usersTable.redeemedCount,
  directUsersCount: usersTable.directUsersCount,
  activeDirectUsersCount: usersTable.activeDirectUsersCount,

  createdAt: usersTable.createdAt,
  updatedAt: usersTable.updatedAt,
};

export type SafeUserReturn = {
  [K in keyof typeof safeUserReturn]: User[K];
};
export default class DatabaseService {
  /**
   * Fetches user data from the database
   */
  async fetchUserData(userId: User["id"]): Promise<SafeUserReturn | null> {
    const userData = await db
      .select(safeUserReturn)
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!userData[0]) return null;
    return userData[0];
  }

  // async fetchTreeUserData(userId: User["id"]): Promise<TreeUser | null> {
  //   const userData = await this.fetchUserData(userId);
  //   if (!userData) return null;
  //   // now we want to fine out the
  //   // total left , total right , total acitve left , total active right
  //   // total left bv , total right bv , total active left bv , total active right bv
  // }
}
export const databaseService = new DatabaseService();
