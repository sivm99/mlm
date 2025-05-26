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
  position: usersTable.position,
  leftUser: usersTable.leftUser,
  rightUser: usersTable.rightUser,

  role: usersTable.role,
  permissions: usersTable.permissions,

  isActive: usersTable.isActive,
  isBlocked: usersTable.isBlocked,

  redeemedTimes: usersTable.redeemedTimes,
  associatedUsersCount: usersTable.associatedUsersCount,
  associatedActiveUsersCount: usersTable.associatedActiveUsersCount,

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
  async fetchUserData(userId: number): Promise<SafeUserReturn | null> {
    const userData = await db
      .select(safeUserReturn)
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!userData[0]) return null;
    return userData[0];
  }
}
