import db from "@/db";
import { generateRandomDigits } from "@/lib/cr";
import { usersTable } from "@/db/schema/users";
import {
  LoginUser,
  SafeUser,
  UpdateFromAdmin,
  UpdateFromUser,
  User,
} from "@/types";
import { password as bunPassword } from "bun";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import { Context } from "hono";
import { setCookie } from "hono/cookie";
import { RegisterUser } from "@/validation/auth.validations";
import TreeService from "./TreeService";
import { walletsTable } from "@/db/schema";
import DatabaseService, { safeUserReturn } from "./DatabaseService";
import { sql } from "drizzle-orm";
import EmailService from "./EmailService";
import { activationTemplate } from "@/templates";

const jwtSecret = process.env.JWT_SECRET!;
const treeService = new TreeService();
const databaseService = new DatabaseService();
const emailService = new EmailService();

class UserService {
  #expireTimeInMinutes = Number(process.env.EXPIRE_TIME_IN_MINUTES) || 5;
  #isDev = process.env.NODE_ENV === "development" ? true : false;
  #host = process.env.HOST || "::1:5000";
  #returnUserObject = safeUserReturn;

  async #getJwtString(id: User["id"]) {
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
        if (!sponserDetails) throw new Error("Sponsor not found");
        await treeService.addUser(user.id, user.sponsor, user.position);
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
      console.error(error);
      throw new Error(
        `Login failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async setTokenCookie(c: Context, id: User["id"]) {
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
        passwordHash: await bunPassword.hash(password),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, id));
  }

  async updateUser(
    id: User["id"],
    updatedUser: UpdateFromUser | UpdateFromAdmin,
  ) {
    await db
      .update(usersTable)
      .set({
        ...updatedUser,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, id));
  }

  async getDirectPartners(id: User["id"]): Promise<SafeUser[]> {
    const users = await db
      .select(this.#returnUserObject)
      .from(usersTable)
      .where(eq(usersTable.sponsor, id));
    return users;
  }

  async activateId(id: User["id"], spenderName?: string): Promise<void> {
    // spenderName is the one who paid for this ID activation
    console.log("Spender Name:", spenderName);
    const user = await databaseService.fetchUserData(id);
    if (!user) throw new Error("User not found for id activation");

    // Activate the user
    await db
      .update(usersTable)
      .set({ isActive: true })
      .where(eq(usersTable.id, id));

    await db
      .update(usersTable)
      .set({
        associatedActiveUsersCount: sql`${usersTable.associatedActiveUsersCount} + 1`,
      })
      .where(eq(usersTable.id, user.sponsor));

    await emailService.sendIdActivationEmail(
      {
        email: user.email,
        name: user.name,
        userId: user.id,
      },
      activationTemplate,
    );
    return;
  }
}
export default UserService;
