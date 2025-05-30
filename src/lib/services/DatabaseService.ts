import db from "@/db";
import { SelectTree, SelectUser, treeTable, usersTable } from "@/db/schema";
import { TreeUser, User } from "@/types";
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

  redeemedCount: usersTable.redeemedCount,
  directUsersCount: usersTable.directUsersCount,
  activeDirectUsersCount: usersTable.activeDirectUsersCount,

  createdAt: usersTable.createdAt,
  updatedAt: usersTable.updatedAt,
};

export type SafeUserColumns = {
  [K in keyof typeof safeUserReturn]: true;
};

export const safeUserColumns: SafeUserColumns = Object.fromEntries(
  Object.keys(safeUserReturn).map((key) => [key, true]),
) as SafeUserColumns;

export const treeReturn = {
  // tree details
  id: treeTable.id, // Uncommented this line as it seems necessary
  sponsor: treeTable.sponsor,
  leftUser: treeTable.leftUser,
  rightUser: treeTable.rightUser,
  parentUser: treeTable.parentUser,
  position: treeTable.position,

  // stats for the team
  leftCount: treeTable.leftCount,
  rightCount: treeTable.rightCount,
  leftActiveCount: treeTable.leftActiveCount,
  rightActiveCount: treeTable.rightActiveCount,

  // stats on the Bv
  leftBv: treeTable.leftBv,
  rightBv: treeTable.rightBv,
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

export const minimalTree = {
  id: treeTable.id,
  sponsor: treeTable.sponsor,
  leftUser: treeTable.leftUser,
  rightUser: treeTable.rightUser,
  parentUser: treeTable.parentUser,
  position: treeTable.position,
};

const syncCountTree = {
  ...minimalTree,
  leftCount: treeTable.leftCount,
  rightCount: treeTable.rightCount,
};

const syncBvAndActiveCountTree = {
  ...minimalTree,
  leftActiveCount: treeTable.leftActiveCount,
  rightActiveCount: treeTable.rightActiveCount,
  leftBv: treeTable.leftBv,
  rightBv: treeTable.rightBv,
};

export type MinimalTreeReturn = {
  [K in keyof typeof minimalTree]: SelectTree[K];
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

  async doesSponsorExists(sponsor: TreeUser["sponsor"]) {
    const user = await db
      .select({
        direct: usersTable.directUsersCount,
        directActive: usersTable.activeDirectUsersCount,
      })
      .from(usersTable)
      .where(eq(usersTable.id, sponsor)) // Fixed: changed treeTable.id to usersTable.id
      .limit(1);
    if (!user[0]) return false;
    return user[0];
  }

  async fetchTreeUserData(userId: User["id"]): Promise<TreeUser | null> {
    // Get user data
    const userData = await this.fetchUserData(userId);
    if (!userData) return null;

    // Get tree data
    const treeData = await db
      .select(treeReturn)
      .from(treeTable)
      .where(eq(treeTable.id, userId))
      .limit(1);

    if (!treeData[0]) return null;

    // Combine user and tree data
    return {
      ...userData,
      ...treeData[0],
    };
  }

  async minimalTreeData(id: TreeUser["id"]) {
    const result = await db
      .select(minimalTree)
      .from(treeTable)
      .where(eq(treeTable.id, id));
    if (!result[0]) return null;
    return result[0];
  }

  async syncCountTreeData(id: TreeUser["id"]) {
    const result = await db
      .select(syncCountTree)
      .from(treeTable)
      .where(eq(treeTable.id, id));
    if (!result[0]) return null;
    return result[0];
  }

  async syncBvAndActiveCountTreeData(id: TreeUser["id"]) {
    const result = await db
      .select(syncBvAndActiveCountTree)
      .from(treeTable)
      .where(eq(treeTable.id, id));
    if (!result[0]) return null;
    return result[0];
  }
}

export const databaseService = new DatabaseService();
