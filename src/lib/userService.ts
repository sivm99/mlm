import db from "@/db";
import { generateRandomDigits } from "./cr";
import { usersTable } from "@/db/schema/users";
import { LoginUser, NewUser, User } from "@/types";
import { password as bunPassword } from "bun";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import { Context } from "hono";
import { setCookie } from "hono/cookie";

const jwtSecret = process.env.JWT_SECRET!;
class UserService {
  #expireTimeInMinutes = Number(process.env.EXPIRE_TIME_IN_MINUTES) || 5;
  #isDev = process.env.NODE_ENV === "development" ? true : false;
  #host = process.env.HOST || "::1:5000";
  #returnUserObject = {
    username: usersTable.username,
    name: usersTable.name,
    mobile: usersTable.mobile,
    country: usersTable.country,
    dialCode: usersTable.dialCode,
    sponsor: usersTable.sponsor,
    role: usersTable.role,
    permissions: usersTable.permissions,
    isActive: usersTable.isActive,
    isBlocked: usersTable.isBlocked,
  };

  async getNewUsername(retryCount = 0): Promise<string> {
    if (retryCount > 10) {
      throw new Error(
        "Failed to generate a unique username after multiple attempts.",
      );
    }
    const newUsername = `AL${generateRandomDigits(8)}`;

    const existingUser = await db
      .select({
        username: usersTable.username,
      })
      .from(usersTable)
      .where(eq(usersTable.username, newUsername))
      .limit(1);

    if (existingUser.length > 0) {
      console.warn(`Username ${newUsername} already exists. Retrying...`);
      return this.getNewUsername(retryCount + 1);
    }

    return newUsername;
  }

  async registerUsers(users: NewUser[]) {
    if (!users || users.length === 0)
      throw new Error("There must be at least one user");

    const processedUsers = await Promise.all(
      users.map(async (user) => {
        const username = await this.getNewUsername();
        if (!user.password)
          throw new Error("User password was not given so exiting");
        const passwordHash = await bunPassword.hash(user.password);
        const { password, ...userWithoutPassword } = user;
        if (this.#isDev) console.warn(password);

        return {
          ...userWithoutPassword,
          username,
          passwordHash,
        } as unknown as User;
      }),
    );
    try {
      const insertedData = await db
        .insert(usersTable)
        .values(processedUsers)
        .returning(this.#returnUserObject);

      return { success: true, users: insertedData };
    } catch (error) {
      console.error("Failed to register users:", error);
      throw new Error(
        `Failed to register users: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loginUser({ username, password }: LoginUser) {
    try {
      const loggedInUser = await db
        .select({
          ...this.#returnUserObject,
          passwordHash: usersTable.passwordHash,
        })
        .from(usersTable)
        .where(eq(usersTable.username, username))
        .limit(1);

      if (!loggedInUser.length) throw new Error("INVALID USERNAME OR PASSWORD");
      const u = loggedInUser[0];
      const hash = u.passwordHash;
      if (!hash) throw new Error("INVALID USERNAME OR PASSWORD");
      const isMatch = await bunPassword.verify(password, hash);
      if (!isMatch) throw new Error("INVALID USERNAME OR PASSWORD");
      if (u.isBlocked) throw new Error("YOU HAVE BEEN BLOCKED BY THE ADMIN");
      const { passwordHash, ...userWithoutPassword } = u;
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

  async getJwtString(username: string) {
    const payload = {
      username,
      exp: Math.floor(Date.now() / 1000) + 60 * this.#expireTimeInMinutes,
    };
    return await sign(payload, jwtSecret);
  }

  async setTokenCookie(c: Context, username: string) {
    const jwt = await this.getJwtString(username);
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

  async getUser(username: string) {
    const user = await db
      .select(this.#returnUserObject)
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);
    if (!user[0]) throw new Error("USER DOES NOT EXIST");
    return user[0];
  }
}
export default UserService;
