import db from "@/db";
import { generateRandomDigits } from "@/lib/cr";
import { usersTable } from "@/db/schema/users";
import {
  LoginUser,
  MyContext,
  SafeUser,
  Side,
  SponsorIncrementArgs,
  ToggleAccountArgs,
  UpdateFromAdmin,
  UpdateFromUser,
  User,
  UserId,
} from "@/types";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import { setCookie } from "hono/cookie";
import {
  InsertArHistory,
  treeTable,
  userStatsTable,
  walletsTable,
} from "@/db/schema";
import {
  databaseService,
  safeUserColumns,
  safeUserReturn,
  treeReturnColumns,
} from "./DatabaseService";
import { treeService } from "./TreeService";
import { treeQueueService } from "./TreeQueueService";
import { walletService } from "./WalletService";
import { arHistoryService } from "./ArHistoryService";
import { RegisterUser } from "@/validation";
import { sql } from "drizzle-orm";
import { salesRewardService } from "./SaleRewardsService";

const jwtSecret = Bun.env.JWT_SECRET!;

export default class UserService {
  #expireTimeInMinutes = Number(Bun.env.EXPIRE_TIME_IN_MINUTES) || 5;
  #isDev = Bun.env.NODE_ENV === "development" ? true : false;
  #host = Bun.env.HOST || "::1:5000";
  #returnUserObject = safeUserReturn;
  #bvCount = 50;
  #packagePrice = 68;
  #deductionPercentage = 26.471;

  async #getJwtString(id: UserId) {
    const payload = {
      id,
      exp: Math.floor(Date.now() / 1000) + 60 * this.#expireTimeInMinutes,
    };
    return await sign(payload, jwtSecret);
  }

  async #getNewId(retryCount = 0): Promise<number> {
    if (retryCount > 10) {
      throw new Error(
        "Failed to generate a unique id after multiple attempts.",
      );
    }
    const newId = generateRandomDigits(7, "number");

    const existingUser = await db
      .select({
        id: usersTable.id,
      })
      .from(usersTable)
      .where(eq(usersTable.id, newId))
      .limit(1);

    if (existingUser.length > 0) {
      console.warn(`id ${newId} already exists. Retrying...`);
      return this.#getNewId(retryCount + 1);
    }

    return newId;
  }

  async registerUsers(users: RegisterUser[]) {
    if (!Array.isArray(users) || users.length === 0) {
      throw new Error("You must provide at least one user in an array.");
    }

    const positionMap: Record<number, Side> = {}; // id -> position
    const sponsorMap: Record<number, UserId> = {}; // id -> sponsor

    const processedUsers = await Promise.all(
      users.map(async (user) => {
        if (!user.password) {
          throw new Error("User password was not given. Exiting.");
        }

        const id = await this.#getNewId();
        const passwordHash = await Bun.password.hash(user.password);
        const { password, side, sponsor, ...userWithoutPassword } = user;

        if (this.#isDev)
          console.warn(
            `Registering user with password, position, referralCode: ${password}`,
          );

        positionMap[id] = side;
        sponsorMap[id] = sponsor;
        return {
          ...userWithoutPassword,
          sponsor,
          id,
          passwordHash,
        };
      }),
    );

    try {
      // Insert users into DB
      const insertedData = await db
        .insert(usersTable)
        .values(processedUsers)
        .returning(this.#returnUserObject);

      const userIds = insertedData.map((user) => ({ id: user.id }));

      // Create wallets
      await db.insert(walletsTable).values(userIds).execute();
      // create stats
      await db.insert(userStatsTable).values(userIds).execute();

      // Queue each tree insert
      await Promise.all(
        insertedData.map(async (user) => {
          const sponsorId = sponsorMap[user.id];
          await treeQueueService.enqueue(sponsorId, async () => {
            const sponsorData =
              await databaseService.doesSponsorExists(sponsorId);
            if (!sponsorData) throw new Error("Sponsor not found");

            const position = positionMap[user.id];
            await this.sponsorCountIncrement({
              id: sponsorId,
              directCount: 1,
              activeDirectCount: 0,
              side: position,
            });

            await treeService.insertIntoTree(user.id, position, sponsorId);
          });
        }),
      );

      return {
        success: true,
        users: insertedData,
      };
    } catch (error) {
      console.error("Failed to register users:", error);
      throw new Error(
        `Failed to register users: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async loginUser({ id, password }: LoginUser) {
    try {
      const loggedInUser = await db
        .select({
          ...this.#returnUserObject,
          passwordHash: usersTable.passwordHash,
        })
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);

      if (!loggedInUser.length) throw new Error("INVALID ID OR PASSWORD");
      const user = loggedInUser[0];
      const hash = user.passwordHash;
      if (!hash) throw new Error("INVALID ID OR PASSWORD");
      const isMatch = await Bun.password.verify(password, hash);
      if (!isMatch) throw new Error("INVALID ID OR PASSWORD");
      if (user.isBlocked) throw new Error("YOU HAVE BEEN BLOCKED BY THE ADMIN");
      const { passwordHash, ...userWithoutPassword } = user;
      if (this.#isDev) console.warn(passwordHash); // just for the eslint
      return {
        success: true,
        user: userWithoutPassword,
      };
    } catch (error) {
      console.error(error);
      throw new Error(
        `Login failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async setTokenCookie(c: MyContext, id: UserId) {
    const jwt = await this.#getJwtString(id);
    return setCookie(c, "token", jwt, {
      path: "/",
      secure: this.#isDev ? false : true,
      httpOnly: true,
      sameSite: "strict",
      domain: this.#host.includes(":") ? this.#host.split(":")[0] : this.#host,
      expires: new Date(Date.now() + 60 * 1000 * this.#expireTimeInMinutes),
      maxAge: 60 * this.#expireTimeInMinutes,
    });
  }

  async getUser(id: User["id"]): Promise<SafeUser | null> {
    return await databaseService.fetchUserData(id);
  }

  async updateUserPassword(id: User["id"], password: string) {
    await db
      .update(usersTable)
      .set({
        passwordHash: await Bun.password.hash(password),
      })
      .where(eq(usersTable.id, id));
  }

  async updateUser(id: UserId, updatedUser: UpdateFromUser | UpdateFromAdmin) {
    await db.update(usersTable).set(updatedUser).where(eq(usersTable.id, id));
  }

  async sponsorCountIncrement({
    id,
    directCount = 1,
    activeDirectCount = 0,
    side,
  }: SponsorIncrementArgs) {
    const updates: Record<string, unknown> = {};

    if (side === "left") {
      updates.leftDirectUsersCount = sql`${userStatsTable.leftDirectUsersCount} + ${directCount}`;
      updates.leftActiveDirectUsersCount = sql`${userStatsTable.leftActiveDirectUsersCount} + ${activeDirectCount}`;
    } else if (side === "right") {
      updates.rightDirectUsersCount = sql`${userStatsTable.rightDirectUsersCount} + ${directCount}`;
      updates.rightActiveDirectUsersCount = sql`${userStatsTable.rightActiveDirectUsersCount} + ${activeDirectCount}`;
    }

    await db
      .update(userStatsTable)
      .set(updates)
      .where(eq(userStatsTable.id, id));

    if (activeDirectCount) {
      await salesRewardService.insertPendingRewards(id);
    }
  }

  async toggleAccountStatus({ id, isActive = true }: ToggleAccountArgs) {
    const user = await databaseService.fetchUserData(id);
    if (!user) throw new Error("The user does not exist");
    await db
      .update(usersTable)
      .set({
        isActive,
      })
      .where(eq(usersTable.id, id));
  }

  async getDirectPartners(id: User["id"]) {
    const rows = await db.query.treeTable.findMany({
      columns: treeReturnColumns,
      where: eq(treeTable.sponsor, id),
      with: {
        userRelation: {
          columns: safeUserColumns,
        },
      },
    });

    return rows.map((row) => {
      return {
        ...row.userRelation,
        ...row,
        user: undefined, // Remove nested user object
      };
    });
  }

  async activateUserIds(fromUserId: UserId, toUserIds: UserId[]) {
    const results: {
      userId: UserId;
      success: boolean;
      error?: string;
    }[] = [];

    for (const toUserId of toUserIds) {
      await treeQueueService.enqueue(fromUserId, async () => {
        try {
          const toUser = await databaseService.getTreeData(toUserId);
          if (!toUser) {
            results.push({
              userId: toUserId,
              success: false,
              error: "User does not exist",
            });
            return;
          }
          const transaction = await walletService.activateId(
            fromUserId,
            toUserId,
            this.#packagePrice,
            this.#deductionPercentage,
          );

          if (transaction.status !== "completed") {
            results.push({
              userId: toUserId,
              success: false,
              error: `Transaction status: ${transaction.status}`,
            });
            return;
          }

          const sponsorData = await databaseService.doesSponsorExists(
            toUser.sponsor,
          );
          if (!sponsorData) {
            results.push({
              userId: toUserId,
              success: false,
              error: "Sponsor not found",
            });
            return;
          }

          await this.sponsorCountIncrement({
            id: toUser.sponsor,
            directCount: 0,
            activeDirectCount: 1,
            side: toUser.position,
          });

          await this.toggleAccountStatus({
            id: toUser.id,
            isActive: true,
          });

          await treeService.syncParentChain(
            toUser.parentUser,
            toUser.position,
            { updateActiveCount: true, bv: this.#bvCount },
          );

          // make the arHistory as well now
          const arHistory: InsertArHistory = {
            fromUserId,
            toUserId,
            investment: this.#packagePrice,
          };
          await arHistoryService.addArHistory(arHistory);

          results.push({
            userId: toUserId,
            success: true,
          });
        } catch (err) {
          results.push({
            userId: toUserId,
            success: false,
            error: String(err) || "Unexpected error",
          });
        }
      });
    }

    return results;
  }
}
export const userService = new UserService();
