import db from "@/db";
import {
  SelectTree,
  SelectUser,
  SelectUserStats,
  treeTable,
  usersTable,
  userStatsTable,
} from "@/db/schema";
import { TreeUser, UserId } from "@/types";
import { eq } from "drizzle-orm";

export const safeUserReturn = {
  id: usersTable.id,
  name: usersTable.name,
  mobile: usersTable.mobile,
  email: usersTable.email,
  country: usersTable.country,
  dialCode: usersTable.dialCode,
  image: usersTable.image,

  role: usersTable.role,
  permissions: usersTable.permissions,

  isActive: usersTable.isActive,
  isBlocked: usersTable.isBlocked,

  createdAt: usersTable.createdAt,
  updatedAt: usersTable.updatedAt,
};

export type SafeUserColumns = {
  [K in keyof typeof safeUserReturn]: true;
};

export const safeUserColumns: SafeUserColumns = Object.fromEntries(
  Object.keys(safeUserReturn).map((key) => [key, true]),
) as SafeUserColumns;

export const minimalTreeReturn = {
  id: treeTable.id,
  leftUser: treeTable.leftUser,
  rightUser: treeTable.rightUser,
};

export type MinimalTreeColumns = {
  [K in keyof typeof minimalTreeReturn]: true;
};
export const minimalTreeReturnColumns: MinimalTreeColumns = Object.fromEntries(
  Object.keys(minimalTreeReturn).map((key) => [key, true]),
) as MinimalTreeColumns;

export const treeReturn = {
  ...minimalTreeReturn,
  sponsor: treeTable.sponsor,
  parentUser: treeTable.parentUser,
  position: treeTable.position,
};

export type TreeColumns = {
  [K in keyof typeof treeReturn]: true;
};

export const treeReturnColumns: TreeColumns = Object.fromEntries(
  Object.keys(treeReturn).map((key) => [key, true]),
) as TreeColumns;

export type SafeUserReturn = {
  [K in keyof typeof safeUserReturn]: SelectUser[K];
};

export type TreeReturn = {
  [K in keyof typeof treeReturn]: SelectTree[K];
};

export const userStatsReturn = {
  id: userStatsTable.id,
  redeemedCount: userStatsTable.redeemedCount,

  leftDirectUsersCount: userStatsTable.leftDirectUsersCount,
  rightDirectUsersCount: userStatsTable.rightDirectUsersCount,
  leftActiveDirectUsersCount: userStatsTable.leftActiveDirectUsersCount,
  rightActiveDirectUsersCount: userStatsTable.rightActiveDirectUsersCount,

  leftCount: userStatsTable.leftCount,
  rightCount: userStatsTable.rightCount,
  leftActiveCount: userStatsTable.leftActiveCount,
  rightActiveCount: userStatsTable.rightActiveCount,
  leftBv: userStatsTable.leftBv,
  rightBv: userStatsTable.rightBv,

  todayLeftCount: userStatsTable.todayLeftCount,
  todayRightCount: userStatsTable.todayRightCount,
  todayLeftActiveCount: userStatsTable.todayLeftActiveCount,
  todayRightActiveCount: userStatsTable.todayRightActiveCount,
  todayLeftBv: userStatsTable.todayLeftBv,
  todayRightBv: userStatsTable.todayRightBv,

  cfLeftBv: userStatsTable.cfLeftBv,
  cfRightBv: userStatsTable.cfRightBv,
};

export type UserStatsReturn = {
  [K in keyof typeof userStatsReturn]: SelectUserStats[K];
};

export default class DatabaseService {
  /**
   * Fetches user data from the database
   */
  async fetchUserData(userId: UserId): Promise<SafeUserReturn | null> {
    const [userData] = await db
      .select(safeUserReturn)
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!userData) return null;
    return userData;
  }

  async doesSponsorExists(sponsor: UserId) {
    const [user] = await db
      .select({
        id: usersTable.id,
      })
      .from(usersTable)
      .where(eq(usersTable.id, sponsor))
      .limit(1);
    if (!user) return false;
    return true;
  }

  async fetchTreeUserData(userId: UserId): Promise<TreeUser | null> {
    // Get user data
    const userData = await this.fetchUserData(userId);
    if (!userData) return null;

    const [treeData] = await db
      .select(treeReturn)
      .from(treeTable)
      .where(eq(treeTable.id, userId))
      .limit(1);

    const [stats] = await db
      .select(userStatsReturn)
      .from(userStatsTable)
      .where(eq(userStatsTable.id, userId))
      .limit(1);
    if (!stats) return null;
    if (!treeData) return null;

    return {
      ...userData,
      ...treeData,
      ...stats,
    };
  }

  async getMinimalTreeData(id: UserId) {
    const [result] = await db
      .select(minimalTreeReturn)
      .from(treeTable)
      .where(eq(treeTable.id, id));
    if (!result) return null;
    return result;
  }

  async getTreeData(id: UserId) {
    const [result] = await db
      .select(treeReturn)
      .from(treeTable)
      .where(eq(treeTable.id, id));
    if (!result) return null;
    return result;
  }

  async getUserStats(id: UserId) {
    const [result] = await db
      .select(userStatsReturn)
      .from(userStatsTable)
      .where(eq(userStatsTable.id, id))
      .limit(1);
    if (!result) return null;
    return result;
  }
}

export const databaseService = new DatabaseService();
