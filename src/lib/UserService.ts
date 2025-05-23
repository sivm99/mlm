import db from "@/db";
import { generateRandomDigits } from "./cr";
import { usersTable } from "@/db/schema/users";
import { LoginUser, SafeUser, UpdateFromAdmin, UpdateFromUser } from "@/types";
import { password as bunPassword } from "bun";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import { Context } from "hono";
import { setCookie } from "hono/cookie";
import { RegisterUser } from "@/validation/auth.validations";
import TreeService from "./TreeService";
import { walletsTable } from "@/db/schema";
import DatabaseService from "./DatabaseService";

const jwtSecret = process.env.JWT_SECRET!;
const treeService = new TreeService();
const databaseService = new DatabaseService();
class UserService {
  #expireTimeInMinutes = Number(process.env.EXPIRE_TIME_IN_MINUTES) || 5;
  #isDev = process.env.NODE_ENV === "development" ? true : false;
  #host = process.env.HOST || "::1:5000";

  #returnUserObject = {
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    mobile: usersTable.mobile,
    country: usersTable.country,
    dialCode: usersTable.dialCode,
    sponsor: usersTable.sponsor,
    leftUser: usersTable.leftUser,
    rightUser: usersTable.rightUser,
    position: usersTable.position,
    role: usersTable.role,
    permissions: usersTable.permissions,
    isActive: usersTable.isActive,
    isBlocked: usersTable.isBlocked,
    redeemedTimes: usersTable.redeemedTimes,
    associatedUsersCount: usersTable.associatedUsersCount,
    associatedActiveUsersCount: usersTable.associatedActiveUsersCount,
  };

  async #getJwtString(id: string) {
    const payload = {
      id,
      exp: Math.floor(Date.now() / 1000) + 60 * this.#expireTimeInMinutes,
    };
    return await sign(payload, jwtSecret);
  }

  async #getNewId(retryCount = 0): Promise<string> {
    if (retryCount > 10) {
      throw new Error(
        "Failed to generate a unique id after multiple attempts.",
      );
    }
    const newId = `AL${generateRandomDigits(7)}`;

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
    const processedUsers = await Promise.all(
      users.map(async (user) => {
        if (!user.password) {
          throw new Error("User password was not given. Exiting.");
        }
        const id = await this.#getNewId();
        const passwordHash = await bunPassword.hash(user.password);
        const { password, ...userWithoutPassword } = user;
        if (this.#isDev)
          console.warn(`Registering user with password: ${password}`);
        return {
          ...userWithoutPassword,
          id,
          passwordHash,
        };
      }),
    );
    try {
      const insertedData = await db
        .insert(usersTable)
        .values(processedUsers)
        .returning(this.#returnUserObject);
      // ✅ Create wallets for each user (only userId needed)
      await db
        .insert(walletsTable)
        .values(
          insertedData.map((user) => ({
            userId: user.id,
          })),
        )
        .execute();

      // ✅ Add users to tree SEQUENTIALLY to avoid race conditions
      for (const user of insertedData) {
        const sponserDetails = await databaseService.fetchUserData(
          user.sponsor,
        );
        await treeService.addUser(
          user.id,
          user.sponsor,
          sponserDetails.position,
        );
      }

      return { success: true, users: insertedData };
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
      const isMatch = await bunPassword.verify(password, hash);
      if (!isMatch) throw new Error("INVALID ID OR PASSWORD");
      if (user.isBlocked) throw new Error("YOU HAVE BEEN BLOCKED BY THE ADMIN");
      const { passwordHash, ...userWithoutPassword } = user;
      if (this.#isDev) console.warn(passwordHash); // just for the eslint
      return {
        success: true,
        user: userWithoutPassword,
      };
    } catch (error) {
      throw new Error(
        `Login failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async setTokenCookie(c: Context, id: string) {
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

  async getUser(id: string): Promise<SafeUser | null> {
    const user = await db
      .select(this.#returnUserObject)
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);
    if (!user[0]) return null;
    const safeUser = user[0] as SafeUser;
    return safeUser;
  }

  async updateUserPassword(id: string, password: string) {
    await db
      .update(usersTable)
      .set({
        passwordHash: await bunPassword.hash(password),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, id));
  }

  async updateUser(id: string, updatedUser: UpdateFromUser | UpdateFromAdmin) {
    await db
      .update(usersTable)
      .set({
        ...updatedUser,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, id));
  }
}
export default UserService;
